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

flags.defineInteger('games', 10, 'Number of games to simulate');
flags.defineString('output', 'output.csv', 'File to store result in CSV format');
flags.parse();

let frameTensor = new FrameTensor();
for (let i = 0; i < flags.get('games'); ++i) {
  const game = new Game(null, null, [
    new Coach(),
    new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game, team))
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
      (game.state == STATES.Pickup || game.state == STATES.Normal || game.state == STATES
      .Receiving);
    ++steps;
    if (recordFrame) {
      frameTensor.recordInitialState(game);
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

frameTensor.dumpToFile(flags.get('output'));