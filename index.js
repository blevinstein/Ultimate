const FRAME_TIME = 300;

import { toImageData, fromImageData, loadImage, sliceImage, getPixel, writePixel, mirrorImage, splitSprite, mirrorImages, colorEquals, rewriteColors } from './image_utils.js';

const SHIRT = [224, 80, 0, 255];
const PANTS = [72, 88, 0, 255];
const HAIR = [0, 0, 0, 255];
const SKIN = [255, 200, 184, 255];
const SOCKS = [255, 255, 255, 255];
const BG = [0, 0, 0, 0];
const EYES = [7, 11, 90, 255];

const COLOR_MAPPING = [
  [BG],
  [EYES],
  [SKIN],
  [SHIRT],
  [PANTS],
  [SOCKS],
  [HAIR],
];

let resources = {};
let initialized = false;

window.initialize = function () {
  console.log('Initializing...');
  const canvas = document.getElementById('canvas');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  const context = canvas.getContext('2d');
  context.scale(2, 2);
  context.imageSmoothingEnabled = false;
  Promise.all([loadImage('images/field.png'), loadImage('images/player_sprite_grid.png')])
      .then((results) => {
        let [field, playerSpriteSet] = results;
        resources.field = field;
        splitSprite(playerSpriteSet, 16, 32).then((splitSprites) => {
          mirrorImages(splitSprites.slice(0, 9)).then((mirroredSprites) => {
            resources.playerSprites = [ ...splitSprites ].concat([ ...mirroredSprites ]);
            resources.directionSprites = {
              'E': resources.playerSprites.slice(0, 3),
              'SE': resources.playerSprites.slice(3, 6),
              'NE': resources.playerSprites.slice(6, 9),
              'N': resources.playerSprites.slice(9, 12),
              'S': resources.playerSprites.slice(12, 15),
              'W': resources.playerSprites.slice(15, 18),
              'SW': resources.playerSprites.slice(18, 21),
              'NW': resources.playerSprites.slice(21, 24),
            };
            initialized = true;
            setTimeout(draw, FRAME_TIME);
            console.log('Initialized.');
          });
        });
      }, (error) => {
        console.log('Failed to initialize.');
        console.log(error);
      });
}

let frame = 0;
const step = [0, 1, 2, 1];

function draw() {
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(resources.field, 0, 0, canvas.width, canvas.height);
  for (let i = 0; i < resources.playerSprites.length / 3; i++) {
    context.drawImage(resources.playerSprites[i * 3 + step[frame % 4]], 20 * (i + 1), 20);
  }
  setTimeout(draw, FRAME_TIME);
  frame++;
}
