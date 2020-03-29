
import { installMathUtils } from './math_utils.js';

import { Coach } from './coach.js';
import { Disc } from './disc.js';
import { Game } from './game.js';
import { Team } from './team.js';
import { MAX_THROW_SPEED } from './player.js';
import { RangeFinderFactory } from './range_finder.js';
import { ManualOffenseStrategy } from './strategy/manual_offense.js';
import { ZoneDefenseStrategy } from './strategy/zone_defense.js';

let initialized = false;

window.initialize = () => {
  console.log('Initializing...');

  window.rangeFinder = RangeFinderFactory.create(MAX_THROW_SPEED);
  installMathUtils(window);

  Game.loadResources().then((resources) => {
    initialized = true;
    console.log('Initialized.');
    start(resources);
  }, (error) => {
    console.log('Failed to initialize.');
    console.log(error);
  });
}

function start(resources) {
  window.game = new Game(resources,
      document.getElementById('canvas'),
      [
        new Coach((game, team) => new ManualOffenseStrategy(game, team)),
        new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game, team)),
      ]);
  window.game.start();
}
