const tf = require('@tensorflow/tfjs');

// In models exported from Python tensorflow, these are the dense and conv1d
// network weights.
const TRAINABLE = ['ReadVariableOp', 'ExpandDims_1'];

function getLastPart(node, separator = '/') {
  if (!node) {
    throw new Error(`Invalid node: ${node}`);
  }
  let lastPart;
  if (node.includes(separator)) {
    const parts = node.split(separator);
    lastPart = parts[parts.length - 1];
  } else {
    lastPart = node;
  }
  return lastPart;
}

// Given a nested Array or Tensor, determine its shape. This method will fail if
// the shape is jagged.
function guessShape(nestedArray) {
  if (nestedArray instanceof tf.Tensor) {
    return guessShape(nestedArray.arraySync());
  } else if (typeof nestedArray === 'number') {
    return [];
  } else if (nestedArray instanceof Array) {
    return [nestedArray.length].concat(guessShape(nestedArray[0]));
  } else {
    throw new Error(`Unexpected input: ${nestedArray}`);
  }
}

// Add two Tensors or nested Arrays.
function recursiveAdd(a, b) {
  if (a instanceof tf.Tensor) {
    return recursiveAdd(a.arraySync(), b);
  }
  if (b instanceof tf.Tensor) {
    return recursiveAdd(a, b.arraySync());
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a + b;
  } else if (a instanceof Array && b instanceof Array) {
    if (a.length !== b.length) {
      throw new Error(`Shape mismatch! ${a.length} != ${b.length}`);
    }
    const result = [];
    for (let i = 0; i < a.length; ++i) {
      result.push(recursiveAdd(a[i], b[i]));
    }
    return result;
  } else {
    throw new Error(`Unexpected input: ${a} and ${b}`);
  }
}

// Apply truncated gaussian normal noise.
module.exports.applyNoise = (model, stdDev = 0.1) => {
  const weights = model.weights;
  for (let layer of Object.keys(weights)) {
    if (TRAINABLE.includes(getLastPart(layer))) {
      weights[layer] = weights[layer].map(mat => {
        const shape = guessShape(mat);
        const noise = tf.truncatedNormal(shape, 0, stdDev, 'float32');
        return tf.tensor(recursiveAdd(mat, noise));
      });
    }
  }
}