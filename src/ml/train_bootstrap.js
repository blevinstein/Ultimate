const tf = require('@tensorflow/tfjs');
const flags = require('flags');

const {
  readFromFile
} = require('../csv_utils.js');

const TRAINING_DATA_LENGTH = 50000;

flags.defineString('input', '', 'File to read training data from');
flags.defineString('output', '', 'File to write trained model to');
flags.parse();

const MODEL_INPUTS = 65;

function actionModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({
    units: 80,
    activation: 'relu',
    inputShape: [65]
  }));
  model.add(tf.layers.dense({
    units: 50,
    activation: 'relu'
  }));
  model.add(tf.layers.dense({
    units: 3,
    activation: 'softmax'
  }));
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'sparseCategoricalCrossentropy',
  });
}

async function main() {
  const model = actionModel();
  const data = await readFromFile(flags.get('input'), (value, context) => {
    if (context.lines === 1) {
      // Parse header row without modification
      return value;
    }
    if (context.column === 'state' || context.column === 'offensiveTeam'
      || context.column === 'offensiveGoalDirection'
      || context.column === 'action') {
      return parseInt(value);
    } else {
      return value === '' ? '' : parseFloat(value);
    }
  });
}

main();
