const fs = require('fs');
const fsPromises = require('fs.promises');
const tf = require('@tensorflow/tfjs-node');
const path = require('path');

const {
  DoubleModelPopulation
} = require('./double_model_population.js');

const CUTTER_MODEL_DIR = 'cutter';

const THROWER_MODEL_DIR = 'thrower';

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

module.exports.LocalDoubleModelPopulation =
  class LocalDoubleModelPopulation extends DoubleModelPopulation {

    // Saves a model to 'modelKey'
    async saveModel(newModel, modelKey) {
      await fsPromises.mkdir(path.join(this.populationDir, modelKey), {
        recursive: true
      });
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
  }