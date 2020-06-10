const tf = require('@tensorflow/tfjs-node');

const {
  applyNoise
} = require('./tensor_utils.js');

tf.loadGraphModel('file://js_model/v1-1/model.json').then((model) => {

  console.log(model);

  applyNoise(model);

  const weights = model.weights;
  for (let layer of Object.keys(weights)) {
    console.log(`***** ${layer}`);
    for (let matrix of weights[layer]) {
      console.log(matrix.arraySync());
    }
  }

  model.save('file://modified/v1-1');
});