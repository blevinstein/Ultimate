const fs = require('fs');
const fsPromises = require('fs.promises');
const path = require('path');

// Companion to the Population class which provides loading/saving capabilities.
// These must be separate so that they can be excluded when we are building with
// browserify.
module.exports.saveRewards = async function saveRewards(
  population, relativeRewardFile, overwrite = false) {
  const rewardFile = path.join(population.populationDir,
  relativeRewardFile);
  console.log(`Saving rewards to ${rewardFile}`);
  if (fs.existsSync(rewardFile) && !overwrite) {
    throw new Error(`Reward file already exists: ${rewardFile}`);
  }
  await fsPromises.writeFile(rewardFile, JSON.stringify([
    Array.from(population.expectedReward.entries()),
    Array.from(population.expectedRewardWeight.entries()),
  ]));
}

module.exports.loadRewards = async function loadRewards(
  population, relativeRewardFile) {
  const rewardFile = path.join(population.populationDir,
  relativeRewardFile);
  console.log(`Loading rewards from ${rewardFile}`);
  if (!fs.existsSync(rewardFile)) {
    throw new Error(`Reward file does not exist: ${rewardFile}`);
  }
  if (population.expectedReward.size > 0) {
    // TODO: Support merging reward maps
    throw new Error('Reward map already contains something!');
  }
  const [rewards, weights] = JSON.parse(await fsPromises.readFile(
    rewardFile));
  population.expectedReward = new Map(rewards);
  population.expectedRewardWeight = new Map(weights);
  for (let modelKey of population.expectedReward.keys()) {
    if (!population.modelKeys.includes(modelKey)) {
      population.modelKeys.push(modelKey);
    }
  }
}