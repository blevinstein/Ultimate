const flags = require('flags')

const {
  Game
} = require('./game.js');
const {
  Population
} = require('./population.js');

const MODELS = [
  'file://js_model/v1-1/model.json',
  'file://js_model/v1-2/model.json',
  'file://js_model/v1-3/model.json',
  'file://js_model/v1-4/model.json',
  'file://js_model/v1-5/model.json',
  'file://js_model/v1-6/model.json',
  'file://js_model/v1-7/model.json',
];

async function main() {
  const population = new Population(MODELS);

  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 2; j++) {
      await population.evaluate();
    }
    population.summarize();
    await population.breed();
  }
}

main();