const {
  Disc
} = require('./disc.js');
const {
  Game
} = require('./game.js');
const {
  Practice
} = require('./practice.js');

let initialized = false;

window.initialize =
  () => {
    console.log('Initializing...');

    Game.loadResources().then(
      (resources) => {
        initialized = true;
        console.log('Initialized.');
        start(resources);
      },
      (error) => {
        console.log('Failed to initialize.');
        console.log(error);
      });
  }

function start(resources) {
  window.game = new Practice(resources, document.getElementById('canvas'));
  window.game.start();
}