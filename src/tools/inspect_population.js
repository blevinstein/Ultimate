const flags = require('flags')
const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

const {
  ModelPopulation
} = require('../model_population.js');
const {
  DoubleModelPopulation
} = require('../double_model_population.js');

async function main() {
  flags.defineString('model_file', '', 'Model definition file.')
    .setValidator(modelFile => {
      if (modelFile === '') {
        throw new Error('Model file is required!');
      }
    });
  flags.defineBoolean('double_model', false,
    'Set to true for separate cutter and thrower models.');
  flags.defineString(
    'population_dir', 'js_model', 'Directory containing rewards and models.'
  );
  flags.defineString(
    'reward_file', 'rewards.json',
    'JSON file for persisting rewards between runs.');
  flags.parse();

  const population = flags.get('double_model')
    ? new DoubleModelPopulation(flags.get('population_dir'))
    : new ModelPopulation(flags.get('population_dir'));
  await population.loadRewards(flags.get('reward_file'));
  population.summarize();
}

main();