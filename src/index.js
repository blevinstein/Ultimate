const tf = require('@tensorflow/tfjs');
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

async function loadModels(n = 3) {
  const population = new DoubleModelPopulation('v4');
  await population.loadRewardsAndModels()
  return Promise.all(
    population.getBestModels(n).map(key => {
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
