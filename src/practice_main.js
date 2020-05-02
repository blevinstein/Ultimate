
import {Disc} from './disc.js';
import {Game} from './game.js';
import {installMathUtils} from './math_utils.js';
import {Practice} from './practice.js';

let initialized = false;

window.initialize =
    () => {
      console.log('Initializing...');

      installMathUtils(window);

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
