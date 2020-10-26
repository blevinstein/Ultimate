const path = require('path');

const {
  Coach
} = require('./coach.js');
const {
  Disc
} = require('./disc.js');
const {
  GameBuilder
} = require('./game_builder.js');
const {
  NUM_PLAYERS
} = require('./team.js');


/*
async function loadModels(n = 3) {
  const population = new DoubleModelPopulation('v4');
  await population.loadRewardsAndModels()
  return Promise.all(
    population.getBestModels(n).map(key => {
      console.log(`Loading ${key}`);
      return population.loadModel(key, '');
    }));
}
*/

window.initialize = GameBuilder.defaultBuilder().defaultInitialize(
    fetch('./index-config.json')
        .then((jsonResponse) => jsonResponse.text())
        .then((jsonText) => JSON.parse(jsonText)),
    document.getElementById('canvas'));
