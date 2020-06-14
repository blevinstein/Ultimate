const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const path = require('path');

const {
  Population
} = require('./population.js');

const GENERATED_MODELS_FILENAME = 'model.json';
const GENERATED_MODELS_PREFIX = 'generated/model-';

module.exports.ModelPopulation = class ModelPopulation extends Population {
  constructor(populationDir) {
    super(populationDir);
  }

  // Loads a model located at 'modelFile' by checking the cache (this.models) and
  // loading from disc if necessary.
  async loadModel(modelFile) {
    return await tf.loadGraphModel(
      `file://${path.join(this.populationDir, modelFile, GENERATED_MODELS_FILENAME)}`
    );
  }

  // Saves a model to 'newModelDir'
  async saveModel(newModel, newModelDir) {
    await newModel.save(
      `file://${path.join(this.populationDir, newModelDir)}`);
  }

  async generateModelDir() {
    let i = 0;
    while (fs.existsSync(path.join(this.populationDir,
        `${GENERATED_MODELS_PREFIX}${i}`))) {
      i++;
    }
    return `${GENERATED_MODELS_PREFIX}${i}`;
  }
}