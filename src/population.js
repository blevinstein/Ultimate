const fs = require('fs');
const fsPromises = require('fs.promises');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

const {
  weightedChoice
} = require('./math_utils.js');
const {
  applyNoise,
  sexAndNoise,
  areCompatible
} = require('./tensor_utils.js');
const {
  Coach
} = require('./coach.js');
const {
  Game
} = require('./game.js');
const {
  ModelStrategy
} = require('./strategy/model_strategy.js');
const {
  STATES
} = require('./game_params.js');
const {
  NUM_PLAYERS
} = require('./team.js');

const GENERATED_MODELS_PREFIX = 'js_model/generated/model-';
const GENERATED_MODELS_FILENAME = 'model.json';
const REWARD_FACTOR = 50;

const SEX_PROBABILITY = 0.5;

// Play a single game until completion, and return corresponding reward scores.
function playGame(models) {
  const game = new Game(null, null, [
    new Coach(),
    ModelStrategy.coach(models),
  ]);

  while (game.state != STATES.GameOver) {
    game.update();
  }

  const rewards = [];
  for (let i = 0; i < NUM_PLAYERS; ++i) {
    rewards.push(game.reward.get(game.teams[1].players[i]));
  }
  return rewards;
}

function rmdirRecursive(path) {
  return new Promise((resolve, reject) => {
    fs.rmdir(path, {
      recursive: true
    }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// TODO: Cleanup poor (generated) models and delete from disk.
module.exports.Population = class Population {
  constructor(modelPaths) {
    // All model paths known
    this.modelPaths = modelPaths;
    // Models which are in memory, keyed by model path
    this.models = new Map;
    // Expected reward for each model path based on previous evaluations
    this.expectedReward = new Map;
    this.expectedRewardWeight = new Map;
  }

  async saveRewards(path, overwrite = false) {
    console.log(`Saving rewards to ${path}`);
    if (fs.existsSync(path) && !overwrite) {
      throw new Error(`Reward file already exists: ${path}`);
    }
    await fsPromises.writeFile(path, JSON.stringify([
      Array.from(this.expectedReward.entries()),
      Array.from(this.expectedRewardWeight.entries()),
    ]));
  }

  async loadRewards(path) {
    console.log(`Loading rewards from ${path}`);
    if (!fs.existsSync(path)) {
      throw new Error(`Reward file does not exist: ${path}`);
    }
    if (this.expectedReward.size > 0) {
      // TODO: Support merging reward maps
      throw new Error('Reward map already contains something!');
    }
    const [rewards, weights] = JSON.parse(await fsPromises.readFile(path));
    this.expectedReward = new Map(rewards);
    this.expectedRewardWeight = new Map(weights);
    for (let modelPath of this.expectedReward.keys()) {
      if (!this.modelPaths.includes(modelPath)) {
        this.modelPaths.push(modelPath);
      }
    }
  }

  async saveModel(newModel, newModelDir) {
    newModelDir = newModelDir || this.generateModelDir();
    const newModelPath = `${newModelDir}/${GENERATED_MODELS_FILENAME}`;
    console.log(`Saving new model to ${newModelDir}`);
    await newModel.save(`file://${newModelDir}`);
    return newModelPath;
  }

  // Loads a model located at 'path' by checking the cache (this.models) and
  // loading from disc if necessary.
  async loadModel(path) {
    if (!this.models.has(path)) {
      // DEBUG: console.log(`Loading model from ${path}`);
      this.models.set(path, await tf.loadGraphModel(`file://${path}`));
    }
    return this.models.get(path);
  }

  // Choose a good model based on expected reward.
  chooseGoodModel() {
    return weightedChoice(
      this.modelPaths,
      path => Math.exp((this.expectedReward.get(path) || 0)
        / REWARD_FACTOR));
  }

  // Chose a model for deletion. Avoids low-weight models, and refuses to delete
  // a model if the total pool of models with sufficient weight is too small.
  chooseBadModel(minWeight = 0, minChoices = 1) {
    const choices = this.modelPaths.filter(
      path => (this.expectedRewardWeight.get(path) || 0) >= minWeight);
    if (choices.length < minChoices) {
      return undefined;
    }
    return weightedChoice(
      choices,
      path => Math.exp(-(this.expectedReward.get(path) || 0)
        / REWARD_FACTOR));
  }

  chooseUncertainModel() {
    return weightedChoice(
      this.modelPaths,
      path => Math.exp(-(this.expectedRewardWeight.get(path) || 0)));
  }

  generateModelDir() {
    let i = 0;
    while (fs.existsSync(`${GENERATED_MODELS_PREFIX}${i}`)) {
      i++;
    }
    return `${GENERATED_MODELS_PREFIX}${i}`;
  }

  size() {
    return this.modelPaths.length;
  }

  summarize() {
    const modelData = this.modelPaths.map(
      path => [path, this.expectedReward.get(path), this
        .expectedRewardWeight.get(path)
      ]);
    modelData.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    console.log(`Population (size=${this.size()}) scores:`);
    for (let [path, reward, weight] of modelData) {
      console.log(
        `${path} => \t ${(reward || 0).toFixed(2)} [weight ${weight}]`);
    }
  }

  async evaluateRewards(chosenModelPaths) {
    const chosenModels = [];
    for (let path of chosenModelPaths) {
      chosenModels.push(await this.loadModel(path));
    }
    console.log(
      `Play game with these models: \n${chosenModelPaths.join('\n')}`);
    return playGame(chosenModels);
  }

  attributeRewards(modelPaths, rewards) {
    for (let i = 0; i < NUM_PLAYERS; ++i) {
      const modelPath = modelPaths[i % modelPaths.length];
      const modelReward = rewards[i] || 0;
      const prevReward = this.expectedReward.get(modelPath) || 0;
      const prevWeight = this.expectedRewardWeight.get(modelPath) || 0;
      const newReward = (prevReward * prevWeight + modelReward) / (
        prevWeight + 1);
      this.expectedReward.set(modelPath, newReward);
      this.expectedRewardWeight.set(modelPath, prevWeight + 1);
    }
  }

  async evaluate(n = 1) {
    for (let e = 0; e < n; ++e) {
      const chosenModelPaths = [];
      const modelsPerTeam = 2;
      for (let i = 0; i < modelsPerTeam; ++i) {
        chosenModelPaths.push(this.chooseUncertainModel());
      }
      try {
        const rewards = await this.evaluateRewards(chosenModelPaths);
        this.attributeRewards(chosenModelPaths, rewards);
        console.log(`Rewards: ${rewards.map(r => (r || 0).toFixed(2))}`);
      } catch (e) {
        console.error(`Failure to evaluate!\n${e}`);
        // TODO: Remove this hack after all bad models are removed.
        this.attributeRewards(
          chosenModelPaths,
          [-1e6, -1e6, -1e6, -1e6, -1e6, -1e6, -1e6]);
        continue;
      }
    }
  }

  async breed(n = 1) {
    // TODO: add sexual reproduction
    for (let i = 0; i < n; ++i) {
      if (Math.random() < SEX_PROBABILITY) {
        const models = [this.chooseGoodModel(), this.chooseGoodModel()];
        console.log(`Reproduce sexually (${models})`);
        await this.sexualReproduction(models);
      } else {
        const model = this.chooseGoodModel();
        console.log(`Reproduce asexually (${model})`);
        await this.asexualReproduction(model);
      }
    }
  }

  async deleteModel(modelPath) {
    const modelDir = path.dirname(modelPath);
    console.log(`Deleting model from ${modelDir}`);
    this.modelPaths.splice(this.modelPaths.findIndex(path => path
      === modelPath), 1);
    this.models.delete(modelPath);
    this.expectedReward.delete(modelPath);
    this.expectedRewardWeight.delete(modelPath);
    await rmdirRecursive(modelDir);
  }

  async kill(n = 1, minWeight = 5, minChoices = 50) {
    console.log(`Try to kill ${n} models`);
    for (let i = 0; i < n; ++i) {
      const chosenModelPath = this.chooseBadModel(false, minWeight,
        minChoices);
      if (!chosenModelPath) {
        console.log('Shortcircuit due to insufficient weights');
        break;
      }
      await this.deleteModel(chosenModelPath);
    }
  }

  async asexualReproduction(sourceModelPath) {
    // Bypass loadModel to create a new model which will not be associated with
    // 'sourceModelPath'.
    const newModel = await tf.loadGraphModel(`file://${sourceModelPath}`);
    applyNoise(newModel, 0.01);

    // Choose a new model path, and save the model to disk.
    const newModelPath = await this.saveModel(newModel);
    this.modelPaths.push(newModelPath);
    this.models.set(newModelPath, newModel);
    this.expectedReward.set(newModelPath, 0);
    this.expectedRewardWeight.set(newModelPath, 0);
  }

  async sexualReproduction(sourceModelPaths) {
    if (sourceModelPaths.length !== 2) {
      throw new Error('Unexpected input length');
    }
    const newModel = await tf.loadGraphModel(
      `file://${sourceModelPaths[0]}`);
    const otherModel = await this.loadModel(sourceModelPaths[1]);
    if (areCompatible(newModel, otherModel)) {
      sexAndNoise(newModel, otherModel, 0.01);
    } else {
      console.error(
        `Reproduction failed! Incompatible models (${sourceModelPaths}).`);
      console.error('Fallback to asexual reproduction.');
      applyNoise(newModel, 0.01);
    }

    // Choose a new model path, and save the model to disk.
    const newModelPath = await this.saveModel(newModel);
    this.modelPaths.push(newModelPath);
    this.models.set(newModelPath, newModel);
    this.expectedReward.set(newModelPath, 0);
    this.expectedRewardWeight.set(newModelPath, 0);
  }
}