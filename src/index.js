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

let initialized = false;

window.initialize = () => {
  console.log('Initializing...');

  Promise.all([Game.loadResources(), tf.loadGraphModel('v1/model.json')])
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
  const [resources, model] = responses;
  window.game = new Game(resources, document.getElementById('canvas'), [
    new Coach(),
    ModelStrategy.coach([model]),
  ]);
  window.game.start();
}
