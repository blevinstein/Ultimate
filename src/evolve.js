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
  flags.defineInteger('rounds', 100, 'Number of breeding rounds to simulate');
  flags.defineInteger('games_per_round', 10,
    'Number of games played per round to evaluate the current population.');
  flags.defineInteger('breeding_per_round', 5,
    'Number of new models to generate during each breeding round.');
  flags.defineStringList('start_population', MODELS,
    'List of models to seed evolution.');
  flags.defineInteger('max_population_size', 300,
    'Max desired population size');
  flags.parse();

  const population = new Population(flags.get('start_population').map(file =>
    `file://${file}`));
  const maxPopulationSize = flags.get('max_population_size');

  for (let i = 0; i < flags.get('rounds'); ++i) {
    for (let j = 0; j < flags.get('games_per_round'); ++j) {
      await population.evaluate();
    }
    population.summarize();
    if (population.size() > maxPopulationSize) {
      await population.kill(population.size() - maxPopulationSize);
    }
    await population.breed(flags.get('breeding_per_round'));
  }
}

main();