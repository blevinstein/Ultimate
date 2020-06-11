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

  async loadModel(path) {
    if (!this.models.has(path)) {
      console.log(`Loading ${path}`);
      this.models.set(path, await tf.loadGraphModel(path));
    }
    return this.models.get(path);
  }

  // Choose between models with weight e^(expectedReward/k) if best = true, or
  // weight e^(-expectedReward/k) if best = false
  chooseModel(best = true, minWeight = 0) {
    return weightedChoice(
      this.modelPaths,
      path => {
        const weight = this.expectedRewardWeight.get(path) || 0;
        if (weight < minWeight) {
          return 0;
        }
        const expectedReward = this.expectedReward.get(path) || 0;
        return Math.exp(
          (expectedReward * (best ? 1 : -1) / REWARD_FACTOR));
      });
  }

  generateModelDir() {
    let i = 0;
    while (fs.existsSync(`${GENERATED_MODELS_PREFIX}${i}`)) {
      i++;
    }
    return `file://${GENERATED_MODELS_PREFIX}${i}`;
  }

  size() {
    return this.modelPaths.length;
  }

  summarize() {
    const modelData = this.modelPaths.map(
      path => [path, this.expectedReward.get(path), this
        .expectedRewardWeight.get(path)
      ]);
    modelData.sort((a, b) => b[1] - a[1]);
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
    for (let i = 0; i < n; ++i) {
      const chosenModelPath = this.chooseModel(false, /*minWeight=*/ 3);
      if (!chosenModelPath) {
        return;
      }
      const modelDir = path.dirname(chosenModelPath);
      console.log(`Deleting model from ${modelDir}`);
      this.modelPaths.splice(this.modelPaths.findIndex(chosenModelPath), 1);
      this.models.delete(chosenModelPath);
      await fsPromises.rmdir(modelDir);
    }
  }

  async asexualReproduction(sourceModelPath) {
    const newModel = await tf.loadGraphModel(sourceModelPath);
    applyNoise(newModel, 0.01);
    const newModelDir = this.generateModelDir();
    const newModelPath = `${newModelDir}/${GENERATED_MODELS_FILENAME}`;
    console.log(`Saving new model to ${newModelDir}`);
    await newModel.save(newModelDir);
    this.modelPaths.push(newModelPath);
    this.models.set(newModelPath, newModel);
  }
}