const tf = require('@tensorflow/tfjs');

const {
  weightedChoice
} = require('./math_utils.js');

// In models exported from Python tensorflow, these are the dense and conv1d
// network weights.
const TRAINABLE = ['ReadVariableOp', 'ExpandDims_1'];
const CROSSOVER_PROBABILITY = 0.2;

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

function eqShape(shapeA, shapeB) {
  if (shapeA.length !== shapeB.length) {
    return false;
  }
  for (let i = 0; i < shapeA.length; ++i) {
    if (shapeA[i] !== shapeB[i]) {
      return false;
    }
  }
  return true;
}

// Given a nested Array or Tensor, determine its shape. This method will fail if
// the shape is jagged.
function guessShape(nestedArray) {
  if (nestedArray instanceof tf.Tensor) {
    throw new Error('Unnecessary call to guessShape for Tensor!');
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

// Split and recombine tensors 'aTensor' and 'bTensor' along 'splitAxis', of
// sizes 'splitSize' and (shape[splitAxis] - 'splitSize').
//
// If 'splitAxis' and 'splitSize' are not provided, they are chosen randomly.
//
// Returns an array of two Tensors.
function crossover(aTensor, bTensor, splitAxis,
  splitSize) {
  const shape = aTensor.shape;
  if (!eqShape(shape, bTensor.shape)) {
    throw new Error('Cannot crossover differently shaped matrices!');
  }

  // Choose an axis along which to split. Longer axes get more weight; axes of
  // length 1 get zero weight. (Optional)
  splitAxis = splitAxis || weightedChoice(
    Array.from(shape.keys()),
    i => shape[i] - 1);
  // Chose a size for the split, between 0 and len(axis) EXCLUSIVE. (Optional)
  splitSize = splitSize || Math.trunc(
    1 + Math.random() * (shape[splitAxis] - 1));

  const aPart =
    tf.split(aTensor, [splitSize, shape[splitAxis] - splitSize], splitAxis);
  const bPart =
    tf.split(bTensor, [splitSize, shape[splitAxis] - splitSize], splitAxis);
  return [tf.concat([aPart[0], bPart[1]], splitAxis),
    tf.concat([bPart[0], aPart[1]], splitAxis)
  ]
}
module.exports.crossover = crossover;

function inspect(model) {
  for (let layer of Object.keys(model.weights)) {
    if (TRAINABLE.includes(getLastPart(layer))) {
      weights[layer].forEach(mat => mat.print());
    }
  }
}
module.exports.inspect = inspect;

// Apply truncated gaussian normal noise.
function applyNoise(model, stdDev = 0.1) {
  const weights = model.weights;
  for (let layer of Object.keys(weights)) {
    if (TRAINABLE.includes(getLastPart(layer))) {
      weights[layer] = weights[layer].map(mat => {
        const noise = tf.truncatedNormal(mat.shape, 0, stdDev, 'float32');
        return tf.tensor(recursiveAdd(mat, noise));
      });
    }
  }
}
module.exports.applyNoise = applyNoise;

function areCompatible(model, otherModel) {
  const weights = model.weights;
  const otherWeights = otherModel.weights;
  for (let layer of Object.keys(weights)) {
    if (!(layer in otherWeights)) {
      return false;
    }
    if (weights[layer].length !== otherWeights[layer].length) {
      return false;
    }
    for (let i = 0; i < weights[layer].length; ++i) {
      if (!eqShape(weights[layer][i].shape, otherWeights[layer][i].shape)) {
        return false;
      }
    }
  }
  return true;
}
module.exports.areCompatible = areCompatible;

// Combine two models, treating each weight matrix roughly as a 'chromosome'.
// Perform crossover and random perturbation.
//
// This function modifies 'model' in-place.
function sexAndNoise(model, otherModel, stdDev = 0.1) {
  const weights = model.weights;
  const otherWeights = otherModel.weights;
  for (let layer of Object.keys(weights)) {
    if (TRAINABLE.includes(getLastPart(layer))) {
      if (!(layer in otherWeights)) {
        console.error(`Layer only present in one model: ${layer}`);
      }
      if (weights[layer].length !== otherWeights[layer].length) {
        console.error(`Layer shape is inconsistent: ${layer}`);
      }
      for (let i = 0; i < weights[layer].length; ++i) {
        const shape = weights[layer][i];
        if (Math.random() < CROSSOVER_PROBABILITY) {
          // Crossover between different parent matrices.
          weights[layer][i] = crossover(weights[layer][i], otherWeights[layer]
            [i]);
        } else {
          // No crossover, inherit from either parent.
          weights[layer][i] =
            Math.random() < 0.5 ? weights[layer][i] : otherWeights[layer][i];
        }
        // Add noise
        const noise = tf.truncatedNormal(shape, 0, stdDev, 'float32');
        weights[layer][i] = tf.tensor(recursiveAdd(weights[layer][i], noise));
      }
    }
  }
}
module.exports.sexAndNoise = sexAndNoise;