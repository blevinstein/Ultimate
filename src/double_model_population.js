const tf = require('@tensorflow/tfjs');
const path = require('path');

const {
  Coach
} = require('./coach.js');
const {
  Game
} = require('./game.js');
const {
  STATES
} = require('./game_params.js');
const {
  Population
} = require('./population.js');
const {
  DoubleModelStrategy
} = require('./strategy/double_model_strategy.js');
const {
  applyNoise,
  areCompatible,
  sexAndNoise
} = require('./tensor_utils.js');
const {
  NUM_PLAYERS
} = require('./team.js');

const REWARDS_FILE = 'rewards.json';
const CUTTER_MODEL_FILE = 'cutter/model.json';
const THROWER_MODEL_FILE = 'thrower/model.json';

const REWARD_CONST = 1e4;

// Play a single game until completion, and return corresponding reward scores.
function playGame(models) {
  const game = new Game(null, null, [
    new Coach(),
    DoubleModelStrategy.coach(models),
  ]);

  while (game.state != STATES.GameOver) {
    game.update();
  }

  const rewards = [];
  for (let i = 0; i < NUM_PLAYERS; ++i) {
    rewards.push(
      game.reward.get(game.teams[1].players[i]) * REWARD_CONST
      / game.totalTicks);
  }
  return rewards;
}

module.exports.DoubleModelPopulation =
  class DoubleModelPopulation extends Population {

    constructor(populationDir) {
      super();
      this.populationDir = populationDir;
    }

    // These methods are not implemented in this file, so that we can support
    // browserify. If you want these methods locally, use
    // LocalDoubleModelPopulation.
    async saveModel(newModel, modelKey) {
      throw new Error('saveModel is not supported');
    }
    async deleteModel(modelKey) {
      throw new Error('deleteModel is not supported');
    }
    async generateModelKey() {
      throw new Error('generateModelKey is not supported');
    }

    // Intended for use in a browser.
    async loadRewardsAndModels() {
      const jsonResponse = await fetch(path.join(this.populationDir,
        REWARDS_FILE));
      if (!jsonResponse.ok) {
        console.error(response.status);
      }
      const [rewards, weights] = JSON.parse(await jsonResponse.text());
      population.expectedReward = new Map(rewards);
      population.expectedRewardWeight = new Map(weights);
      for (let modelKey of population.expectedReward.keys()) {
        if (!population.modelKeys.includes(modelKey)) {
          population.modelKeys.push(modelKey);
        }
      }
    }

    async loadModel(modelKey, prefix = 'file://') {
      return {
        cutter: await tf.loadGraphModel(
          prefix + path.join(this.populationDir, modelKey,
            CUTTER_MODEL_FILE)),
        thrower: await tf.loadGraphModel(
          prefix + path.join(this.populationDir, modelKey,
            THROWER_MODEL_FILE)),
      };
    }

    async evaluateRewards(rewardModelKeys) {
      const chosenModels = [];
      for (let modelKey of rewardModelKeys) {
        chosenModels.push(await this.getModel(modelKey));
      }
      console.log(
        `Play game with these models: \n${rewardModelKeys.join(',')}`);
      return playGame(chosenModels);
    }

    async asexualReproduction(modelKey) {
      const newModel = await this.loadModel(modelKey);
      applyNoise(newModel.cutter);
      applyNoise(newModel.thrower);

      return await this.registerNewModel(newModel);
    }

    async sexualReproduction(modelKeys) {
      if (modelKeys.length !== 2) {
        throw new Error('Unexpected input length');
      }
      const newModel = await this.loadModel(modelKeys[0]);
      const otherModel = await this.getModel(modelKeys[1]);

      if (areCompatible(newModel.cutter, otherModel.cutter)
        && areCompatible(newModel.thrower, otherModel.thrower)) {
        sexAndNoise(newModel.cutter, otherModel.cutter);
        sexAndNoise(newModel.thrower, otherModel.thrower);
      } else {
        throw new Error(
          `Reproduction failed! Incompatible models (${modelKeys}).`);
      }

      if (!areCompatible(newModel.cutter, otherModel.cutter)
        || !areCompatible(newModel.thrower, otherModel.thrower)) {
        throw new Error(
          'Reproduction failed! Produced an incompatible model.');
      }

      return await this.registerNewModel(newModel);
    }
  }
