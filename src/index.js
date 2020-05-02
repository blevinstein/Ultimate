
import {Coach} from './coach.js';
import {Disc} from './disc.js';
import {Game} from './game.js';
import {installMathUtils} from './math_utils.js';
import {MAX_THROW_SPEED} from './player.js';
import {ZoneDefenseStrategy} from './strategy/zone_defense.js';
import {Team} from './team.js';

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
  window.game = new Game(resources, document.getElementById('canvas'), [
    new Coach(),
    new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game, team)),
  ]);
  window.game.start();
}
