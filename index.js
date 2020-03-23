const FRAME_TIME = 200;

import { toImageData, fromImageData, loadImage, sliceImage, getPixel, writePixel, mirrorImage, splitSprite, mirrorImages, colorEquals } from './image_utils.js';
import { Team } from './team.js';

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
let teams = [];

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
  teams = [new Team(resources, COLOR_MAPPING)];
  teams[0].addPlayer([50, 50]);
  setTimeout(draw, FRAME_TIME);
}

function draw() {
  const canvas = document.getElementById('canvas');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(resources.field, 0, 0, canvas.width, canvas.height);
  for (let team of teams) {
    team.draw(context);
  }
  setTimeout(draw, FRAME_TIME);
}
