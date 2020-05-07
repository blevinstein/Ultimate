const flags = require('flags')
const {
  Worker,
  isMainThread,
  parentPort,
  workerData
} = require('worker_threads');

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

function playGame() {
  const frame_tensor = new FrameTensor();
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

  while (game.state != STATES.GameOver) {
    // Only save data from 'interesting' frames
    let recordFrame =
      (game.state == STATES.Pickup || game.state == STATES.Normal
        || game.state == STATES.Receiving);
    if (recordFrame) {
      frame_tensor.recordGameState(game);
    }
    game.update();
    if (recordFrame) {
      frame_tensor.recordActions(game, actionMap);
      frame_tensor.nextFrame();
    }
    actionMap.clear();
  }
  return frame_tensor;
}

function writeOutput(frame_tensor) {
  if (flags.get('output_raw') !== '') {
    const frame_data = frame_tensor.getFrameCsvData();
    writeToFile(flags.get('output_raw'), frame_data);
    console.log(
      `Writing frames (shape ${frame_data[0].length} x ${frame_data.length-1}) to ${flags.get('output_raw')}`
    );
  } else {
    console.log('Not writing frame data.');
  }

  if (flags.get('output') !== '') {
    const agentData = frame_tensor.getPermutedCsvData();
    writeToFile(flags.get('output'), agentData);
    console.log(
      `Writing examples (shape ${agentData[0].length} x ${agentData.length-1}) to ${flags.get('output')}`
    );
  } else {
    console.log('Not writing examples.');
  }
}

async function main() {
  if (isMainThread) {

    flags.defineInteger('games', 10, 'Number of games to simulate');
    flags.defineInteger(
      'min_tasks_per_worker', 4, 'Minimum number of tasks per worker thread'
    );
    flags.defineInteger(
      'max_workers',
      8,
      'Maximum number of worker threads to use for processing');
    flags.defineString(
      'output_raw',
      '',
      'File to store raw frame data in CSV format');
    flags.defineString(
      'output',
      'data/examples.csv',
      'File to store permuted agent training data in CSV format');
    flags.parse();

    const num_games = flags.get('games');
    const num_workers =
      Math.max(1,
        Math.min(
          Math.floor(num_games / flags.get('min_tasks_per_worker')),
          flags.get('max_workers')));

    let frame_tensor = new FrameTensor();
    let games_played = 0;
    let workers_alive = num_workers;

    const checkDone = () => {
      if (games_played === num_games && workers_alive === 0) {
        writeOutput(frame_tensor);
      }
    }

    // Assign carefully so that we have the exact right number of games played.
    const tasks_per_worker = Math.ceil(num_games / num_workers);
    const extra_capacity = num_workers * tasks_per_worker - num_games;
    for (let i = 0; i < num_workers; ++i) {
      const num_tasks = tasks_per_worker - (i < extra_capacity ? 1 : 0);
      console.log(`Spawn worker: play ${num_tasks} games`);
      const worker = new Worker(__filename, {
        workerData: num_tasks
      });
      worker.on('message', (new_frame_tensor) => {
        ++games_played;
        frame_tensor = frame_tensor.add(new_frame_tensor);
        console.log(
          `Frames: ${frame_tensor.frames.length} \
                  (${new_frame_tensor.frames.length} new)`);
        checkDone();
      });
      worker.on('error', (e) => console.error(e));
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.log(`Worked stoped with code ${code}`);
        }
        --workers_alive;
        checkDone();
      });
    }
  } else {
    for (let i = 0; i < workerData; ++i) {
      parentPort.postMessage(playGame());
    }
  }
}

main();