const tf = require('@tensorflow/tfjs');

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
  ModelStrategy
} = require('./strategy/model_strategy.js');
const {
  ZoneDefenseStrategy
} = require('./strategy/zone_defense.js');

const modelRewards = require('../data/rewards.json');

let initialized = false;

function chooseModels() {
  const [rewards, weights] = modelRewards;
  rewards.sort((a, b) => b[1] - a[1]);
  const fullPaths = rewards.slice(0, NUM_PLAYERS).map(r => r[0]);
  return fullPaths.map(fullPath => fullPath.slice('js_model/'.length));
}

// Returns Promise<Array<Model>>
function loadModels(paths) {
  return Promise.all(
    paths.map(path => tf.loadGraphModel(path)));
}

window.initialize = () => {
  console.log('Initializing...');

  Promise.all([Game.loadResources(), loadModels(chooseModels())])
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
    ModelStrategy.coach(models),
  ]);
  window.game.start();
}