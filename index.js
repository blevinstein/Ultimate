const FRAME_TIME = 200;

import { toImageData, fromImageData, loadImage, sliceImage, getPixel, writePixel, mirrorImage, splitSprite, mirrorImages, colorEquals } from './image_utils.js';

import { Game } from './game.js';
import { Team } from './team.js';

const fieldSize = [496, 204];

let resources = {};
let initialized = false;
let game;
let fieldScale;
let fieldOffset;

window.initialize = function () {
  console.log('Initializing...');
  setupCanvas();
  window.onresize = setupCanvas;
  window.onkeypress = (event) => {
    if (event.key.toUpperCase() === 'R') {
      game = new Game(resources);
    }
  };
  Promise.all([
        loadImage('images/field.png'),
        loadImage('images/player_sprite_grid.png'),
        loadImage('images/disc.png')
      ]).then((results) => {
        let [fieldSprite, playerSpriteSet, discSprite] = results;
        resources.fieldSprite = fieldSprite;
        resources.discSprite = discSprite;
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

function start() {
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');
  context.save()
  game = new Game(resources);
  setTimeout(draw, FRAME_TIME);
}

function setupCanvas() {
  const canvas = document.getElementById('canvas');
  const wRatio = canvas.parentElement.clientWidth / fieldSize[0];
  const hRatio = canvas.parentElement.clientHeight / fieldSize[1];
  fieldScale = Math.min(wRatio, hRatio);
  fieldOffset = wRatio < hRatio
      ? [0, (canvas.parentElement.clientHeight - fieldSize[1] * fieldScale) / 2]
      : [(canvas.parentElement.clientWidth - fieldSize[0] * fieldScale) / 2, 0];
  console.log('Field scale ' + fieldScale + ' offset ' + fieldOffset);
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  console.log('Canvas size: ' + canvas.width + ', ' + canvas.height);
  const context = canvas.getContext('2d');
  context.restore()
  context.save()
  context.imageSmoothingEnabled = false;
  context.translate(fieldOffset[0], fieldOffset[1]);
  context.scale(fieldScale, fieldScale);
}

function draw() {
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');
  game.draw(context);
  setTimeout(draw, FRAME_TIME);
}
