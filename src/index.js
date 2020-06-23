const tf = require('@tensorflow/tfjs');
const jsonp = require('jsonp');
const path = require('path');

const {
  Coach
} = require('./coach.js');
const {
  Disc
} = require('./disc.js');
const {
  Game
} = require('./game.js');
const {
  NUM_PLAYERS
} = require('./team.js');
const {
  DoubleModelStrategy
} = require('./strategy/double_model_strategy.js');
const {
  DoubleModelPopulation
} = require('./double_model_population.js');

let initialized = false;

async function loadRewards(population, rewardFile) {
  const jsonResponse = await fetch(path.join(population.populationDir,
    rewardFile));
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

// Returns Promise<Array<Model>>
async function loadModels(paths) {
  const population = new DoubleModelPopulation('v4');
  await loadRewards(population, 'rewards.json');
  return Promise.all(
    population.getBestModels(3).map(key => {
      console.log(`Loading ${key}`);
      return population.loadModel(key, '');
    }));
}

window.initialize = () => {
  console.log('Initializing...');

  Promise.all([Game.loadResources(), loadModels()])
    .then(
      (responses) => {
        initialized = true;
        console.log('Initialized.');
        start(responses);
      },
      (error) => {
        console.log('Failed to initialize.');
        console.log(error);
      });
};

function start(responses) {
  const [resources, models] = responses;
  window.game = new Game(resources, document.getElementById('canvas'), [
    new Coach(),
    DoubleModelStrategy.coach(models),
  ]);
  window.game.start();
}