const FRAME_TIME = 300;

// returns ImageData
function toImageData(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height);
  return canvas.getContext('2d').getImageData(0, 0, image.width, image.height);
}

// returns Promise<Image>
function fromImageData(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext('2d').putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL()
  const image = new Image();
  const promise = new Promise((resolve, reject) => {
    image.onload = () => { resolve(image); };
    image.onerror = (error) => { reject(error); };
  });
  image.src = dataUrl;
  return promise;
}

function loadImage(path) {
  const image = new Image();
  const promise = new Promise((resolve, reject) => {
    image.onload = () => { resolve(image); };
    image.onerror = (error) => { reject(error); }
  });
  image.src = path;
  return promise;
}

function sliceImage(sourceImage, startX, startY, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImage.width;
  canvas.height = sourceImage.height;
  canvas.getContext('2d').drawImage(sourceImage, 0, 0);
  return canvas.getContext('2d').getImageData(startX, startY, width, height);
}

// returns [R, G, B, A]
function getPixel(imageData, x, y) {
  const index = (x + y * imageData.width) * 4;
  return imageData.data.slice(index, index + 4);
}

function writePixel(imageData, x, y, pixel) {
  const index = (x + y * imageData.width) * 4;
  for (let i = 0; i < 4; i++) {
    imageData.data[index + 0] = pixel[0];
    imageData.data[index + 1] = pixel[1];
    imageData.data[index + 2] = pixel[2];
    imageData.data[index + 3] = pixel[3];
  }
}

// equals function for two colors
function eq(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function rewriteColors(imageData, colorMapping) {
  for (let x = 0; x < imageData.width; x++) {
    for (let y = 0; y < imageData.height; y++) {
      const color = getPixel(imageData, x, y);
      let mapped = false;
      for (let entry of colorMapping) {
        const [oldColor, newColor] = entry;
        if (eq(oldColor, color)) {
          if (newColor) {
            writePixel(imageData, x, y, newColor);
          }
          mapped = true;
          break;
        }
      }
      if (!mapped) { console.log('Unmapped color: ' + color); }
    }
  }
}

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

// returns Promise<Iterable<Image>>
function splitSprite(spriteImage, gridX, gridY) {
  // Copy into separate images
  const spritePromises = [];
  for (let i = 0; i < spriteImage.width; i += gridX) {
    for (let j = 0; j < spriteImage.height; j += gridY) {
      const newImageData = sliceImage(spriteImage, i, j, gridX, gridY);
      rewriteColors(newImageData, COLOR_MAPPING);
      spritePromises.push(fromImageData(newImageData));
    }
  }
  return Promise.all(spritePromises);
}

// returns ImageData
function mirrorImage(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  context.save()
  context.scale(-1, 1);
  context.drawImage(image, -image.width, 0, image.width, image.height);
  context.restore()
  return context.getImageData(0, 0, image.width, image.height);
}

// returns Promise<Iterable<Image>>
function mirrorSprites(spriteImages) {
  const spritePromises = [];
  for (let spriteImage of spriteImages) {
    spritePromises.push(fromImageData(mirrorImage(spriteImage)));
  }
  return Promise.all(spritePromises);
}

let resources = {};
let initialized = false;

function initialize() {
  console.log('Initializing...');
  const canvas = document.getElementById('canvas');
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  const context = canvas.getContext('2d');
  context.scale(2, 2);
  context.imageSmoothingEnabled = false;
  Promise.all([loadImage('images/field.png'), loadImage('images/player_sprite_grid.png')])
      .then((results) => {
        [field, playerSpriteSet] = results;
        resources.field = field;
        splitSprite(playerSpriteSet, 16, 32).then((splitSprites) => {
          mirrorSprites(splitSprites.slice(0, 9)).then((mirroredSprites) => {
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
