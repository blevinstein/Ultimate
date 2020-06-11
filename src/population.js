const fs = require('fs');
const fsPromises = require('fs.promises');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

const {
  weightedChoice
} = require('./math_utils.js');
const {
  applyNoise
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

const GENERATED_MODELS_PREFIX = 'js_model/generated/model-';
const GENERATED_MODELS_FILENAME = 'model.json';
const REWARD_FACTOR = 100;

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
  for (let i = 0; i < 7; ++i) {
    rewards.push(game.reward.get(game.teams[1].players[i]));
  }
  return rewards;
}

function rmdirRecursive(path) {
  return new Promise((resolve, reject) => {
    fs.rmdir(path, {recursive: true}, (error) => {
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
  }

  async saveModel(newModel, newModelDir) {
    newModelDir = newModelDir || this.generateModelDir();
    const newModelPath = `${newModelDir}/${GENERATED_MODELS_FILENAME}`;
    console.log(`Saving new model to ${newModelDir}`);
    await newModel.save(`file://${newModelDir}`);
    return newModelPath;
  }

  async loadModel(path) {
    if (!this.models.has(path)) {
      console.log(`Loading ${path}`);
      this.models.set(path, await tf.loadGraphModel(`file://${path}`));
    }
    return this.models.get(path);
  }

  // Choose between models with weight e^(expectedReward/k) if best = true, or
  // weight e^(-expectedReward/k) if best = false
  chooseModel(best = true, minWeight = 0, minChoices = 1) {
    const choices = this.modelPaths.filter(
      path => (this.expectedRewardWeight.get(path) || 0) >= minWeight);
    if (choices.length < minChoices) {
      return undefined;
    }
    return weightedChoice(
      choices,
      path => Math.exp(
        ((this.expectedReward.get(path) || 0) * (best ? 1 : -1)
          / REWARD_FACTOR)));
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
      console.log(`${path} => \t ${reward} [weight ${weight}]`);
    }
  }

  async evaluate() {
    const chosenModelPaths = [];
    for (let i = 0; i < 7; ++i) {
      chosenModelPaths.push(this.chooseModel());
    }
    const chosenModels = [];
    for (let path of chosenModelPaths) {
      chosenModels.push(await this.loadModel(path));
    }
    const rewards = playGame(chosenModels);
    for (let i = 0; i < 7; ++i) {
      // Attribute reward to the relevant model.
      const modelPath = chosenModelPaths[i];
      const modelReward = rewards[i] || 0;
      const prevReward = this.expectedReward.get(modelPath) || 0;
      const prevWeight = this.expectedRewardWeight.get(modelPath) || 0;
      const newReward = (prevReward * prevWeight + modelReward) / (
        prevWeight + 1);
      this.expectedReward.set(modelPath, newReward);
      this.expectedRewardWeight.set(modelPath, prevWeight + 1);
    }
  }

  async breed(n = 1) {
    // TODO: add sexual reproduction
    for (let i = 0; i < n; ++i) {
      await this.asexualReproduction(this.chooseModel());
    }
  }

  async kill(n = 1) {
    console.log(`Try to kill ${n} models`);
    for (let i = 0; i < n; ++i) {
      const chosenModelPath =
        this.chooseModel(false, /*minWeight=*/ 5, /*minChoices=*/ 20);
      if (!chosenModelPath) {
        console.log('Shortcircuit due to insufficient weights');
        break;
      }
      const modelDir = path.dirname(chosenModelPath);
      console.log(`Deleting model from ${modelDir}`);
      this.modelPaths.splice(this.modelPaths.findIndex(path => path
        === chosenModelPath), 1);
      this.models.delete(chosenModelPath);
      await rmdirRecursive(modelDir);
    }
  }

  async asexualReproduction(sourceModelPath) {
    const newModel = await tf.loadGraphModel(`file://${sourceModelPath}`);
    applyNoise(newModel, 0.01);
    const newModelPath = await this.saveModel(newModel);
    this.modelPaths.push(newModelPath);
    this.models.set(newModelPath, newModel);
  }
}
