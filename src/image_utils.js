
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

// Splits a single image into a grid of images sized gridX x gridY
// returns Promise<Iterable<Image>>
function splitSprite(spriteImage, gridX, gridY) {
  // Copy into separate images
  const spritePromises = [];
  for (let i = 0; i < spriteImage.width; i += gridX) {
    for (let j = 0; j < spriteImage.height; j += gridY) {
      const newImageData = sliceImage(spriteImage, i, j, gridX, gridY);
      spritePromises.push(fromImageData(newImageData));
    }
  }
  return Promise.all(spritePromises);
}

// returns Promise<Iterable<Image>>
function mirrorImages(images) {
  const spritePromises = [];
  for (let image of images) {
    spritePromises.push(fromImageData(mirrorImage(image)));
  }
  return Promise.all(spritePromises);
}

// returns true iff a equals b; a and b are colors
function colorEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

// Update imageData in place according to mappings defined in colorMapping
function rewriteColors(imageData, colorMapping) {
  for (let x = 0; x < imageData.width; x++) {
    for (let y = 0; y < imageData.height; y++) {
      const color = getPixel(imageData, x, y);
      let mapped = false;
      for (let entry of colorMapping) {
        const [oldColor, newColor] = entry;
        if (colorEquals(oldColor, color)) {
          if (newColor) {
            writePixel(imageData, x, y, newColor);
          }
          mapped = true;
          break;
        }
      }
      if (!mapped) {
        // DEBUG: console.log('Unmapped color: ' + color);
      }
    }
  }
}

// returns Promise<Iterable<Image>>
function recolorImages(images, colorMapping) {
  const canvas = document.createElement('canvas');
  const imagePromises = [];
  for (let image of images) {
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, image.width, image.height);
    rewriteColors(imageData, colorMapping);
    imagePromises.push(fromImageData(imageData));
  }
  return Promise.all(imagePromises);
}

module.exports = {
  toImageData,
  fromImageData,
  loadImage,
  sliceImage,
  getPixel,
  writePixel,
  mirrorImage,
  splitSprite,
  mirrorImages,
  colorEquals,
  rewriteColors,
  recolorImages
};
