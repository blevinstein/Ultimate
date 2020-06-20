const flags = require('flags')
const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

const {
  inspectModel
} = require('../tensor_utils.js');

async function main() {
  flags.defineString('model_file', '', 'Model definition file.')
    .setValidator(modelFile => {
      if (modelFile === '') {
        throw new Error('Model file is required!');
      }
    });
  flags.defineBoolean('show_values', true, 'Show layer values');
  flags.parse();

  const model = await tf.loadGraphModel('file://' + flags.get('model_file'));
  inspectModel(model, flags.get('show_values'));
}

main();