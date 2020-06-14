const fs = require('fs');
const tf = require('@tensorflow/tfjs-node');
const path = require('path');

const {
  Population
} = require('./population.js');
const {
  applyNoise,
  areCompatible,
  sexAndNoise
} = require('./tensor_utils.js');

const GENERATED_MODELS_FILENAME = 'model.json';
const GENERATED_MODELS_PREFIX = 'generated/model-';

function rmdirRecursive(dir) {
  return new Promise((resolve, reject) => {
    fs.rmdir(dir, {
      recursive: true
    }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

module.exports.ModelPopulation = class ModelPopulation extends Population {
  constructor(populationDir) {
    super(populationDir);
  }

  async loadModel(modelKey) {
    return await tf.loadGraphModel('file://'
      + path.join(this.populationDir, modelKey, GENERATED_MODELS_FILENAME)
    );
  }

  // Saves a model to 'modelKey'
  async saveModel(newModel, modelKey) {
    await newModel.save(
      `file://${path.join(this.populationDir, modelKey)}`);
  }

  async deleteModel(modelKey) {
    await rmdirRecursive(path.join(this.populationDir, modelKey));
  }

  async generateModelKey() {
    let i = 0;
    while (fs.existsSync(path.join(this.populationDir,
        GENERATED_MODELS_PREFIX + i))) {
      i++;
    }
    return GENERATED_MODELS_PREFIX + i;
  }

  async asexualReproduction(modelKey) {
    const newModel = await this.loadModel(modelKey);
    applyNoise(newModel);

    return await this.registerNewModel(newModel);
  }

  async sexualReproduction(modelKeys) {
    if (modelKeys.length !== 2) {
      throw new Error('Unexpected input length');
    }
    const newModel = await this.loadModel(modelKeys[0]);
    const otherModel = await this.getModel(modelKeys[1]);

    if (areCompatible(newModel, otherModel)) {
      sexAndNoise(newModel, otherModel);
    } else {
      throw new Error(
        `Reproduction failed! Incompatible models (${modelKeys}).`);
    }

    if (!areCompatible(newModel, otherModel)) {
      throw new Error(
        'Reproduction failed! Produced an incompatible model.');
    }

    return await this.registerNewModel(newModel);
  }
}