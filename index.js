const FRAME_TIME = 30;

import { toImageData, fromImageData, loadImage, sliceImage, getPixel, writePixel, mirrorImage, splitSprite, mirrorImages, colorEquals } from './image_utils.js';
import { installMathUtils } from './math_utils.js';

import { Disc } from './disc.js';
import { Game } from './game.js';
import { Team } from './team.js';
import { RangeFinderFactory } from './range_finder.js';

let resources = {};
let initialized = false;

window.initialize = () => {
  console.log('Initializing...');

  window.rangeFinder = RangeFinderFactory.create(2);
  installMathUtils(window);

  window.onkeypress = (event) => {
    if (event.key.toUpperCase() === 'R') {
      window.clearTimeout(frameCallback);
      window.game = new Game(resources, document.getElementById('canvas'));
      frameCallback = window.setTimeout(draw, FRAME_TIME);
    } else if (event.key.toUpperCase() === 'Q') {
      window.clearTimeout(frameCallback);
    }
  };
  Promise.all([
        loadImage('images/field.png'),
        loadImage('images/player_sprite_grid.png'),
        loadImage('images/disc.png'),
        loadImage('images/disc_shadow.png'),
      ]).then((results) => {
        let [fieldSprite, playerSpriteSet, discSprite, discShadowSprite] = results;
        resources.fieldSprite = fieldSprite;
        resources.discSprite = discSprite;
        resources.discShadowSprite = discShadowSprite;
        splitSprite(playerSpriteSet, 16, 32).then((splitSprites) => {
          mirrorImages(splitSprites).then((mirroredSprites) => {
            resources.playerSprites = [ ...splitSprites ].concat([ ...mirroredSprites ])
            console.log('After mirroring, loaded ' + resources.playerSprites.length + ' sprites.');
            resources.runningSprites = {
              'E': resources.playerSprites.slice(0, 3),
              'SE': resources.playerSprites.slice(3, 6),
              'NE': resources.playerSprites.slice(6, 9),
              'N': resources.playerSprites.slice(9, 12),
              'S': resources.playerSprites.slice(12, 15),
              'W': resources.playerSprites.slice(21, 24),
              'SW': resources.playerSprites.slice(24, 27),
              'NW': resources.playerSprites.slice(27, 30),
            };
            resources.standingSprites = {
              'S': resources.playerSprites[15],
              'SE': resources.playerSprites[16],
              'NE': resources.playerSprites[17],
              'N': resources.playerSprites[18],
              'E': resources.playerSprites[19],
              'SW': resources.playerSprites[37],
              'NW': resources.playerSprites[38],
              'W': resources.playerSprites[40],
            };
            initialized = true;
            console.log('Initialized.');
            start();
          });
        });
      }, (error) => {
        console.log('Failed to initialize.');
        console.log(error);
      });
}

let frameCallback;

function start() {
  window.game = new Game(resources, document.getElementById('canvas'));

  frameCallback = setTimeout(draw, FRAME_TIME);
}

function draw() {
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');
  game.draw(context);
  game.update();
  frameCallback = setTimeout(draw, FRAME_TIME);
}
