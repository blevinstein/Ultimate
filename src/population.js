const {
  weightedChoice
} = require('./math_utils.js');
const {
  NUM_PLAYERS
} = require('./team.js');

const REWARD_FACTOR = 50;
const WEIGHT_FACTOR = 10;
const SEX_PROBABILITY = 0.8;

module.exports.Population = class Population {
  constructor() {
    // All models in the population
    this.modelKeys = [];
    // Models which are in memory, keyed by model path
    this.models = new Map;
    // Expected reward for each model path based on previous evaluations
    this.expectedReward = new Map;
    this.expectedRewardWeight = new Map;
  }

  addModels(modelKeys) {
    if (modelKeys.length) {
      this.modelKeys.push(...modelKeys);
      for (let newModelKey of modelKeys) {
        this.expectedReward.set(newModelKey, 0);
        this.expectedRewardWeight.set(newModelKey, 0);
      }
    }
  }

  async registerNewModel(newModel, newModelKey) {
    newModelKey = newModelKey || await this.generateModelKey();

    console.log(`Saving new model to ${newModelKey}`);
    await this.saveModel(newModel, newModelKey);

    // Update model cache and rewards.
    this.modelKeys.push(newModelKey);
    this.models.set(newModelKey, newModel);
    this.expectedReward.set(newModelKey, 0);
    this.expectedRewardWeight.set(newModelKey, 0);
    return newModelKey;
  }

  // Loads a model 'modelKey' by checking the cache (this.models) or loading
  // from storage if necessary.
  async getModel(modelKey) {
    if (!this.models.has(modelKey)) {
      // DEBUG: console.log(`Loading model ${modelKey}`);
      this.models.set(modelKey, await this.loadModel(modelKey));
    }
    return this.models.get(modelKey);
  }

  // Choose a good model based on expected reward.
  chooseGoodModel() {
    return weightedChoice(
      this.modelKeys,
      modelKey => Math.exp((this.expectedReward.get(modelKey) || 0)
        / REWARD_FACTOR));
  }

  // Chose a model for deletion. Avoids low-weight models, and refuses to delete
  // a model if the total pool of models with sufficient weight is too small.
  chooseBadModel(minWeight = 0, minChoices = 1) {
    const choices = this.modelKeys.filter(
      modelKey => (this.expectedRewardWeight.get(modelKey) || 0)
      >= minWeight);
    if (choices.length < minChoices) {
      return undefined;
    }
    return weightedChoice(
      choices,
      modelKey => Math.exp(-(this.expectedReward.get(modelKey) || 0)
        / REWARD_FACTOR));
  }

  chooseUncertainModel() {
    return weightedChoice(
      this.modelKeys,
      modelKey => Math.exp(-(this.expectedRewardWeight.get(modelKey)
          || 0)
        / WEIGHT_FACTOR));
  }

  size() {
    return this.modelKeys.length;
  }

  summarize() {
    const modelData = this.modelKeys.map(
      modelKey => [modelKey, this.expectedReward.get(modelKey), this
        .expectedRewardWeight.get(modelKey)
      ]);
    modelData.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    console.log(`Population (size=${this.size()}) scores:`);
    for (let [modelKey, reward, weight] of modelData) {
      console.log(
        `\t ${modelKey} => \t ${(reward || 0).toFixed(2)} [weight ${weight}]`
      );
    }
  }

  getBestModels(n = 1) {
    // Copy modelKeys and sort by expected reward.
    const modelData = this.modelKeys.slice();
    modelData.sort((a, b) =>
      this.expectedReward.get(b) - this.expectedReward.get(a));

    return modelData.slice(0, n);
  }

  attributeRewards(rewardModelKeys, rewards) {
    for (let i = 0; i < NUM_PLAYERS; ++i) {
      const modelKey = rewardModelKeys[i % rewardModelKeys.length];
      const modelReward = rewards[i] || 0;
      const prevReward = this.expectedReward.get(modelKey) || 0;
      const prevWeight = this.expectedRewardWeight.get(modelKey) || 0;
      const newReward = (prevReward * prevWeight + modelReward) / (
        prevWeight + 1);
      this.expectedReward.set(modelKey, newReward);
      this.expectedRewardWeight.set(modelKey, prevWeight + 1);
    }
  }

  async evaluate(n = 1) {
    if (!this.modelKeys.length) {
      throw new Error('Cannot evaluate with no models!');
    }
    for (let e = 0; e < n; ++e) {
      const evaluateModelKeys = [];
      for (let i = 0; i < NUM_PLAYERS; ++i) {
        evaluateModelKeys.push(this.chooseUncertainModel());
      }
      try {
        const rewards = await this.evaluateRewards(evaluateModelKeys);
        this.attributeRewards(evaluateModelKeys, rewards);
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

  async kill(n = 1, minWeight = 5, minChoices = 50) {
    console.log(`Try to kill ${n} models`);
    for (let i = 0; i < n; ++i) {
      const killModelKey = this.chooseBadModel(false, minWeight,
        minChoices);
      if (!killModelKey) {
        console.log('Shortcircuit due to insufficient weights');
        break;
      }

      console.log(`Deleting model ${killModelKey}`);
      await this.deleteModel(killModelKey);
      this.modelKeys.splice(this.modelKeys.findIndex(file => file
        === killModelKey), 1);
      this.models.delete(killModelKey);
      this.expectedReward.delete(killModelKey);
      this.expectedRewardWeight.delete(killModelKey);
    }
  }
}