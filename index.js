
import { installMathUtils } from './math_utils.js';

import { Disc } from './disc.js';
import { Game } from './game.js';
import { Team } from './team.js';
import { RangeFinderFactory } from './range_finder.js';

let initialized = false;

window.initialize = () => {
  console.log('Initializing...');

  window.rangeFinder = RangeFinderFactory.create(2);
  installMathUtils(window);

  Game.loadResources().then((resources) => {
    initialized = true;
    console.log('Initialized: ' + Object.keys(resources));
    start(resources);
  }, (error) => {
    console.log('Failed to initialize.');
    console.log(error);
  });

  window.onkeypress = (event) => {
    if (event.key.toUpperCase() === 'R') {
      window.game.reset();
      if (!window.game.isRunning()) { window.game.start(); }
    } else if (event.key.toUpperCase() === 'Q') {
      if (window.game.isRunning()) { window.game.stop(); }
    } else if (event.key.toUpperCase() === 'W') {
      if (!window.game.isRunning()) { window.game.start(); }
    }
  };
}

function start(resources) {
  window.game = new Game(resources, document.getElementById('canvas'));
  window.game.start();
}
