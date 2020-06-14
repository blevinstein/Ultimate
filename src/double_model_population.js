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

const CUTTER_MODEL_DIR = 'cutter';
const CUTTER_MODEL_FILE = 'cutter/model.json';

const THROWER_MODEL_DIR = 'thrower';
const THROWER_MODEL_FILE = 'thrower/model.json';

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

module.exports.DoubleModelPopulation =
  class DoubleModelPopulation extends Population {

    constructor(populationDir) {
      super(populationDir);
    }

    async loadModel(modelKey) {
      return {
        cutter: await tf.loadGraphModel(
          'file://' + path.join(this.populationDir, modelKey,
            CUTTER_MODEL_FILE)),
        thrower: await tf.loadGraphModel(
          'file://' + path.join(this.populationDir, modelKey,
            THROWER_MODEL_FILE)),
      };
    }

    // Saves a model to 'modelKey'
    async saveModel(newModel, modelKey) {
      await newModel.cutter.save(
        'file://' + path.join(this.populationDir, modelKey,
          CUTTER_MODEL_DIR));
      await newModel.thrower.save(
        'file://' + path.join(this.populationDir, modelKey,
          THROWER_MODEL_DIR));
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
      applyNoise(newModel.cutter);
      applyNoise(newModel.thrower);

      return await this.registerNewModel(newModel);
    }

    async sexualReproduction(modelKeys) {
      if (modelKeys.length !== 2) {
        throw new Error('Unexpected input length');
      }
      const newModel = await this.loadModel(modelKeys[0]);
      const otherModel = await this.getModel(modelKeys[1]);

      if (areCompatible(newModel.cutter, otherModel.cutter)
        && areCompatible(newModel.thrower, otherModel.thrower)) {
        sexAndNoise(newModel.cutter, otherModel.cutter);
        sexAndNoise(newModel.thrower, otherModel.thrower);
      } else {
        throw new Error(
          `Reproduction failed! Incompatible models (${modelKeys}).`);
      }

      if (!areCompatible(newModel.cutter, otherModel.cutter)
        || !areCompatible(newModel.thrower, otherModel.thrower)) {
        throw new Error(
          'Reproduction failed! Produced an incompatible model.');
      }

      return await this.registerNewModel(newModel);
    }
  }