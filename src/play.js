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
  ModelStrategy
} = require('./strategy/model_strategy.js');
const {
  ZoneDefenseStrategy
} = require('./strategy/zone_defense.js');
const {
  Team
} = require('./team.js');

let initialized = false;

function makeModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({units: 80, inputShape: [75]}));
  model.add(tf.layers.dense({units: 60}));
  model.add(tf.layers.dense({units: 10}));
  model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
  return Promise.resolve(model);
}

window.initialize =
  () => {
    console.log('Initializing...');

    Promise.all([Game.loadResources(), tf.loadLayersModel('v1/model.json')]).then(
    //Promise.all([Game.loadResources(), makeModel()]).then(
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
  const [resources, model] = responses;
  const strategyPicker = (game, team) => new ModelStrategy(model, game, team);
  window.game = new Game(resources, document.getElementById('canvas'), [
    new Coach((game, team) => new ManualOffenseStrategy(game, team)),
    new Coach(strategyPicker, strategyPicker)
  ]);
  window.game.start();
}
