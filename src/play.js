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
  MAX_THROW_SPEED
} = require('./player.js');
const {
  ManualOffenseStrategy
} = require('./strategy/manual_offense.js');
const {
  SingleModelStrategy
} = require('./strategy/single_model_strategy.js');
const {
  ZoneDefenseStrategy
} = require('./strategy/zone_defense.js');
const {
  Team
} = require('./team.js');

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

function makeModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 80,
    inputShape: [75]
  }));
  model.add(tf.layers.dense({
    units: 60
  }));
  model.add(tf.layers.dense({
    units: 10
  }));
  model.compile({
    optimizer: 'sgd',
    loss: 'meanSquaredError'
  });
  return Promise.resolve(model);
}

window.initialize =
  () => {
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
  }

function start(responses) {
  const [resources, models] = responses;
  window.game = new Game(resources, document.getElementById('canvas'), [
    new Coach((game, team) => new ManualOffenseStrategy(game, team)),
    SingleModelStrategy.coach(models),
  ]);
  window.game.start();
}