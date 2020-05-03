const flags = require('flags')

const {
  Coach
} = require('./coach.js');
const {
  Game
} = require('./game.js');
const {
  STATES
} = require('./game_params.js');
const {
  ConsoleToastService
} = require('./console_toast_service.js');
const {
  FrameTensor
} = require('./frame_tensor.js');
const {
  ZoneDefenseStrategy
} = require('./strategy/zone_defense.js');
const {
  writeToFile
} = require('./csv_utils.js');

flags.defineInteger('games', 10, 'Number of games to simulate');
flags.defineString('output_raw', '',
  'File to store raw frame data in CSV format');
flags.defineString('output', 'data/examples.csv',
  'File to store permuted agent training data in CSV format');
flags.parse();

let frameTensor = new FrameTensor();
for (let i = 0; i < flags.get('games'); ++i) {
  const game = new Game(null, null, [
    new Coach(),
    new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game,
      team))
  ]);
  const actionMap = new Map;

  game.onNewStrategy = strategy => {
    strategy.onMove = (player, destination) => {
      if (actionMap.has(player)) {
        throw new Error('Player already has an action registered!');
      }
      actionMap.set(player, ['move', destination]);
    };
    strategy.onThrow = (player, params) => {
      if (actionMap.has(player)) {
        throw new Error('Player already has an action registered!');
      }
      actionMap.set(player, ['throw', params]);
    }
  };

  let steps = 0;
  while (game.state != STATES.GameOver) {
    // Only save data from 'interesting' frames
    let recordFrame =
      (game.state == STATES.Pickup || game.state == STATES.Normal
        || game.state == STATES.Receiving);
    ++steps;
    if (recordFrame) {
      frameTensor.recordGameState(game);
    }
    game.update();
    if (recordFrame) {
      frameTensor.recordActions(game, actionMap);
      frameTensor.nextFrame();
    }
    actionMap.clear();
  }
  console.log(`Game over! ${steps} steps`);
}

if (flags.get('output_raw') !== '') {
  const frameData = frameTensor.getFrameCsvData();
  writeToFile(flags.get('output_raw'), frameData);
  console.log(
    `Writing frames (shape ${frameData[0].length} x ${frameData.length-1}) to ${flags.get('output_raw')}`
  );
} else {
  console.log('Not writing frame data.');
}

if (flags.get('output') !== '') {
  const agentData = frameTensor.getPermutedCsvData();
  writeToFile(flags.get('output'), agentData);
  console.log(
    `Writing examples (shape ${agentData[0].length} x ${agentData.length-1}) to ${flags.get('output')}`
  );
} else {
  console.log('Not writing examples.');
}
