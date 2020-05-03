const flags = require('flags')
const fs = require('fs');
const stringify = require('csv-stringify');

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

flags.defineInteger('games', 10, 'Number of games to simulate');
flags.defineString('output_raw', 'data/output_raw.csv',
  'File to store raw frame data in CSV format');
flags.defineString('output', 'data/output.csv',
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

function dumpToFile(filename, data) {
  const lines = [];
  const stringifier = stringify({
    delimiter: ','
  });
  stringifier.on('readable', () => {
    let row;
    while (row = stringifier.read()) {
      lines.push(row);
    }
  });
  stringifier.on('error', (e) => {
    console.error(e.message);
  });
  stringifier.on('finish', () => {
    fs.writeFile(filename, lines.join(''), (e) => {
      if (e) throw err;
    });
  });
  for (let i = 0; i < data.length; i++) {
    stringifier.write(data[i]);
  }
  stringifier.end();
}

const frameData = frameTensor.getFrameCsvData();
dumpToFile(flags.get('output_raw'), frameData);
console.log(`Wrote ${frameData.length-1} frames to ${flags.get('output_raw')}`);

const agentData = frameTensor.getPermutedCsvData();
dumpToFile(flags.get('output'), agentData);
console.log(`Wrote ${agentData.length-1} examples to ${flags.get('output')}`);