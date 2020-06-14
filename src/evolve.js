const flags = require('flags')
const fs = require('fs');
const path = require('path');

const {
  Game
} = require('./game.js');
const {
  Population
} = require('./population.js');

async function main() {
  flags.defineInteger('rounds', 1000,
    'Number of breeding rounds to simulate.');
  flags.defineInteger('games_per_round', 5,
    'Number of games played per round to evaluate the current population.');
  flags.defineInteger('breeding_per_round', 2,
    'Number of new models to generate during each breeding round.');
  flags.defineStringList(
    'start_population', [], 'List of models to seed evolution.');
  flags.defineInteger('max_population_size', 1000,
    'Max desired population size.');
  flags.defineString(
    'reward_file', 'rewards.json',
    'JSON file for persisting rewards between runs.');
  flags.defineString(
    'population_dir', 'js_model', 'Directory containing rewards and models.'
  );
  flags.parse();

  const maxPopulationSize = flags.get('max_population_size');
  const populationDir = flags.get('population_dir');
  const rewardFile = flags.get('reward_file');

  const population = new Population(populationDir);
  population.addModels(flags.get('start_population'));
  if (rewardFile && fs.existsSync(path.join(populationDir, rewardFile))) {
    await population.loadRewards(rewardFile);
  } else {
    console.log(`Warning: reward file does not exist [${rewardFile}]`);
  }

  let quitFlag = false;
  process.on('SIGINT', () => {
    console.log('Caught interrupt! Stopping after next round.');
    quitFlag = true;
  });

  for (let i = 0; i < flags.get('rounds'); ++i) {
    await population.evaluate(flags.get('games_per_round'));
    population.summarize();
    if (population.size() > maxPopulationSize) {
      await population.kill(population.size() - maxPopulationSize);
    }
    await population.breed(flags.get('breeding_per_round'));
    await population.saveRewards(rewardFile, true);
    if (quitFlag) {
      process.exit(0);
    }
  }
}

main();