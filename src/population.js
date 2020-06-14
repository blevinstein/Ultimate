const fs = require('fs');
const fsPromises = require('fs.promises');
const path = require('path');

const {
  weightedChoice
} = require('./math_utils.js');
const {
  applyNoise,
  areCompatible,
  inspect,
  sexAndNoise
} = require('./tensor_utils.js');
const {
  Coach
} = require('./coach.js');
const {
  Game
} = require('./game.js');
const {
  SingleModelStrategy
} = require('./strategy/single_model_strategy.js');
const {
  STATES
} = require('./game_params.js');
const {
  NUM_PLAYERS
} = require('./team.js');

const REWARD_FACTOR = 50;
const WEIGHT_FACTOR = 10;
const EXCEPTION_REWARD = -1e6;

const SEX_PROBABILITY = 0.8;

// Returns an array of length 'length' filled with elements of 'value'
function filled(value, length) {
  const array = [];
  array.length = length;
  array.fill(value);
  return array;
}

// Play a single game until completion, and return corresponding reward scores.
function playGame(models) {
  const game = new Game(null, null, [
    new Coach(),
    SingleModelStrategy.coach(models),
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

function rmdirRecursive(dir) {
  return new Promise((resolve, reject) => {
    fs.rmdir(dir, {
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
  constructor(populationDir) {
    this.populationDir = populationDir;
    // All models in the population
    this.modelFiles = [];
    // Models which are in memory, keyed by model path
    this.models = new Map;
    // Expected reward for each model path based on previous evaluations
    this.expectedReward = new Map;
    this.expectedRewardWeight = new Map;
  }

  addModels(modelFiles) {
    if (modelFiles.length) {
      this.modelFiles.push(...modelFiles);
    }
  }

  async saveRewards(relativeRewardFile, overwrite = false) {
    const rewardFile = path.join(this.populationDir, relativeRewardFile);
    console.log(`Saving rewards to ${rewardFile}`);
    if (fs.existsSync(rewardFile) && !overwrite) {
      throw new Error(`Reward file already exists: ${rewardFile}`);
    }
    await fsPromises.writeFile(rewardFile, JSON.stringify([
      Array.from(this.expectedReward.entries()),
      Array.from(this.expectedRewardWeight.entries()),
    ]));
  }

  async loadRewards(relativeRewardFile) {
    const rewardFile = path.join(this.populationDir, relativeRewardFile);
    console.log(`Loading rewards from ${rewardFile}`);
    if (!fs.existsSync(rewardFile)) {
      throw new Error(`Reward file does not exist: ${rewardFile}`);
    }
    if (this.expectedReward.size > 0) {
      // TODO: Support merging reward maps
      throw new Error('Reward map already contains something!');
    }
    const [rewards, weights] = JSON.parse(await fsPromises.readFile(
      rewardFile));
    this.expectedReward = new Map(rewards);
    this.expectedRewardWeight = new Map(weights);
    for (let modelPath of this.expectedReward.keys()) {
      if (!this.modelFiles.includes(modelPath)) {
        this.modelFiles.push(modelPath);
      }
    }
  }

  async registerNewModel(newModel, newModelDir) {
    newModelDir = newModelDir || await this.generateModelDir();
    console.log(`Saving new model to ${newModelDir}`);
    await this.saveModel(newModel, newModelDir);
    return newModelDir;
  }

  // Loads a model 'modelFile' by checking the cache (this.models) or loading
  // from storage if necessary.
  async getModel(modelFile) {
    if (!this.models.has(modelFile)) {
      // DEBUG: console.log(`Loading model from ${modelFile}`);
      this.models.set(modelFile, await this.loadModel(modelFile));
    }
    return this.models.get(modelFile);
  }

  // Choose a good model based on expected reward.
  chooseGoodModel() {
    return weightedChoice(
      this.modelFiles,
      modelFile => Math.exp((this.expectedReward.get(modelFile) || 0)
        / REWARD_FACTOR));
  }

  // Chose a model for deletion. Avoids low-weight models, and refuses to delete
  // a model if the total pool of models with sufficient weight is too small.
  chooseBadModel(minWeight = 0, minChoices = 1) {
    const choices = this.modelFiles.filter(
      modelFile => (this.expectedRewardWeight.get(modelFile) || 0)
      >= minWeight);
    if (choices.length < minChoices) {
      return undefined;
    }
    return weightedChoice(
      choices,
      modelFile => Math.exp(-(this.expectedReward.get(modelFile) || 0)
        / REWARD_FACTOR));
  }

  chooseUncertainModel() {
    return weightedChoice(
      this.modelFiles,
      modelFile => Math.exp(-(this.expectedRewardWeight.get(modelFile)
          || 0)
        / WEIGHT_FACTOR));
  }

  size() {
    return this.modelFiles.length;
  }

  summarize() {
    const modelData = this.modelFiles.map(
      modelFile => [modelFile, this.expectedReward.get(modelFile), this
        .expectedRewardWeight.get(modelFile)
      ]);
    modelData.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    console.log(`Population (size=${this.size()}) scores:`);
    for (let [modelFile, reward, weight] of modelData) {
      console.log(
        `${modelFile} => \t ${(reward || 0).toFixed(2)} [weight ${weight}]`
      );
    }
  }

  async evaluateRewards(rewardModelFiles) {
    const chosenModels = [];
    for (let modelFile of rewardModelFiles) {
      chosenModels.push(await this.getModel(modelFile));
    }
    console.log(
      `Play game with these models: \n${rewardModelFiles.join('\n')}`);
    return playGame(chosenModels);
  }

  attributeRewards(rewardModelFiles, rewards) {
    for (let i = 0; i < NUM_PLAYERS; ++i) {
      const modelFile = rewardModelFiles[i % rewardModelFiles.length];
      const modelReward = rewards[i] || 0;
      const prevReward = this.expectedReward.get(modelFile) || 0;
      const prevWeight = this.expectedRewardWeight.get(modelFile) || 0;
      const newReward = (prevReward * prevWeight + modelReward) / (
        prevWeight + 1);
      this.expectedReward.set(modelFile, newReward);
      this.expectedRewardWeight.set(modelFile, prevWeight + 1);
    }
  }

  async evaluate(n = 1) {
    if (!this.modelFiles.length) {
      throw new Error('Cannot evaluate with no models!');
    }
    for (let e = 0; e < n; ++e) {
      const evaluateModelFiles = [];
      for (let i = 0; i < NUM_PLAYERS; ++i) {
        evaluateModelFiles.push(this.chooseUncertainModel());
      }
      try {
        const rewards = await this.evaluateRewards(evaluateModelFiles);
        this.attributeRewards(evaluateModelFiles, rewards);
        console.log(`Rewards: ${rewards.map(r => (r || 0).toFixed(2))}`);
      } catch (e) {
        throw new Error(`Failure to evaluate!\n${e}`);
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

  async deleteModel(modelFile) {
    const modelDir = path.dirname(modelFile);
    console.log(`Deleting model from ${modelDir}`);
    this.modelFiles.splice(this.modelFiles.findIndex(file => file
      === modelFile), 1);
    this.models.delete(modelFile);
    this.expectedReward.delete(modelFile);
    this.expectedRewardWeight.delete(modelFile);
    await rmdirRecursive(modelDir);
  }

  async kill(n = 1, minWeight = 5, minChoices = 50) {
    console.log(`Try to kill ${n} models`);
    for (let i = 0; i < n; ++i) {
      const killModelFile = this.chooseBadModel(false, minWeight,
        minChoices);
      if (!killModelFile) {
        console.log('Shortcircuit due to insufficient weights');
        break;
      }
      await this.deleteModel(killModelFile);
    }
  }

  async asexualReproduction(sourceModelPath) {
    // Bypass getModel to create a new model which will not be associated with
    // 'sourceModelPath'.
    const newModel = await this.loadModel(sourceModelPath);
    applyNoise(newModel);

    const newModelPath = await this.registerNewModel(newModel);
    this.modelFiles.push(newModelPath);
    this.models.set(newModelPath, newModel);
    this.expectedReward.set(newModelPath, 0);
    this.expectedRewardWeight.set(newModelPath, 0);
  }

  async sexualReproduction(sourceModelPaths) {
    if (sourceModelPaths.length !== 2) {
      throw new Error('Unexpected input length');
    }
    const newModel = await this.loadModel(sourceModelPaths[0]);
    const otherModel = await this.getModel(sourceModelPaths[1]);

    if (areCompatible(newModel, otherModel)) {
      sexAndNoise(newModel, otherModel);
    } else {
      console.error(
        `Reproduction failed! Incompatible models (${sourceModelPaths}).`);
      console.error('Fallback to asexual reproduction.');
      applyNoise(newModel);
    }

    if (!areCompatible(newModel, otherModel)) {
      // DEBUG
      //console.log('********** otherModel');
      //inspect(otherModel);
      //console.log('********** newModel');
      //inspect(newModel);
      throw new Error(
        'Reproduction failed! Produced an incompatible model.');
    }

    const newModelPath = await this.registerNewModel(newModel);
    this.modelFiles.push(newModelPath);
    this.models.set(newModelPath, newModel);
    this.expectedReward.set(newModelPath, 0);
    this.expectedRewardWeight.set(newModelPath, 0);
  }
}