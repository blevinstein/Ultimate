const flags = require('flags')
const fs = require('fs');

const {
  Game
} = require('./game.js');
const {
  Population
} = require('./population.js');

const MODELS = [
  'js_model/v1-1/model.json',
  'js_model/v1-2/model.json',
  'js_model/v1-3/model.json',
  'js_model/v1-4/model.json',
  'js_model/v1-5/model.json',
  'js_model/v1-6/model.json',
  'js_model/v1-7/model.json',
];

async function main() {
  flags.defineInteger('rounds', 100, 'Number of breeding rounds to simulate');
  flags.defineInteger('games_per_round', 20,
    'Number of games played per round to evaluate the current population.');
  flags.defineInteger('breeding_per_round', 5,
    'Number of new models to generate during each breeding round.');
  flags.defineStringList('start_population', MODELS,
    'List of models to seed evolution.');
  flags.defineInteger('max_population_size', 1000,
    'Max desired population size');
  flags.defineString(
    'reward_file', 'data/rewards.json',
    'JSON file for persisting rewards between runs');
  flags.parse();

  const maxPopulationSize = flags.get('max_population_size');
  const rewardFile = flags.get('reward_file');

  const population = new Population(flags.get('start_population'));
  if (rewardFile && fs.existsSync(rewardFile)) {
    await population.loadRewards(rewardFile);
  }

  for (let i = 0; i < flags.get('rounds'); ++i) {
    await population.evaluate(flags.get('games_per_round'));
    population.summarize();
    await population.saveRewards(rewardFile, true);
    if (population.size() > maxPopulationSize) {
      await population.kill(population.size() - maxPopulationSize);
    }
    await population.breed(flags.get('breeding_per_round'));
  }
}

main();