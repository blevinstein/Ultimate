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
  ModelStrategy
} = require('./strategy/model_strategy.js');
const {
  ZoneDefenseStrategy
} = require('./strategy/zone_defense.js');

const ALL_MODELS = [
  'v1-1/model.json',
  'v1-2/model.json',
  'v1-3/model.json',
  'v1-4/model.json',
  'v1-5/model.json',
  'v1-6/model.json',
  'v1-7/model.json',
];

let initialized = false;

// Returns Promise<Array<Model>>
function loadModels(paths) {
  return Promise.all(
    paths.map(path => tf.loadGraphModel(path)));
}

window.initialize = () => {
  console.log('Initializing...');

  Promise.all([Game.loadResources(), loadModels(ALL_MODELS)])
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