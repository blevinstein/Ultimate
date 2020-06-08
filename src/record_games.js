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

const ACTION_COLUMNS = [
  'team_0_player_0_action',
  'team_0_player_1_action',
  'team_0_player_2_action',
  'team_0_player_3_action',
  'team_0_player_4_action',
  'team_0_player_5_action',
  'team_0_player_6_action',
  'team_1_player_0_action',
  'team_1_player_1_action',
  'team_1_player_2_action',
  'team_1_player_3_action',
  'team_1_player_4_action',
  'team_1_player_5_action',
  'team_1_player_6_action',
];

// Play a single game until completion, and return as a FrameTensor.
function playGame(enriched = false) {
  let frameTensor = new FrameTensor();
  const game = new Game(null, null, [
    new Coach(),
    new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game,
      team))
  ]);
  const actionMap = new Map;

  game.recordActions(actionMap);

  while (game.state != STATES.GameOver) {
    frameTensor.recordGameState(game);
    game.update();
    frameTensor.recordActions(game, actionMap);
    frameTensor.nextFrame();
    actionMap.clear();
  }

  if (enriched) {
    frameTensor = frameTensor.filter(
      frame => ACTION_COLUMNS.some(column => frame.get(column) === 'throw'));
  }

  return frameTensor;
}

function writeOutput(frameTensor) {
  if (flags.get('output_raw') !== '') {
    const frame_data = frameTensor.getFrameCsvData();
    writeToFile(flags.get('output_raw'), frame_data);
    console.log(
      `Writing frames (shape ${frame_data[0].length} x ${frame_data.length-1}) to ${flags.get('output_raw')}`
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
}

async function main() {
  flags.defineInteger('games', 10, 'Number of games to simulate');
  flags.defineBoolean(
    'parallel',
    true,
    'Set to train in using multiple worker threads');
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
  flags.defineBoolean(
    'enriched',
    false,
    'Set to true for examples from throwing frames only.');
  flags.parse();

  const numGames = flags.get('games');

  if (flags.get('parallel')) {
    if (isMainThread) {
      trainParallel(numGames);
    } else {
      trainParallelWorker();
    }
  } else {
    trainSerial(numGames);
  }
}

function trainSerial(numGames) {
  let frameTensor = new FrameTensor();

  for (let i = 0; i < numGames; ++i) {
    const newFrameTensor = playGame(flags.get('enriched'));
    frameTensor = frameTensor.add(newFrameTensor);
    console.log(
      `Frames: ${frameTensor.frames.length} \
              (${newFrameTensor.frames.length} new)`);
  }

  writeOutput(frameTensor);
}

function trainParallel(numGames) {
  const numWorkers =
    Math.max(1,
      Math.min(
        Math.floor(numGames / flags.get('min_tasks_per_worker')),
        flags.get('max_workers')));

  let frameTensor = new FrameTensor();
  let gamesPlayed = 0;
  let workersAlive = numWorkers;

  const checkDone = () => {
    if (gamesPlayed === numGames && workersAlive === 0) {
      writeOutput(frameTensor);
    }
  }

  // Assign carefully so that we have the exact right number of games played.
  const tasksPerWorker = Math.ceil(numGames / numWorkers);
  const extra_capacity = numWorkers * tasksPerWorker - numGames;
  for (let i = 0; i < numWorkers; ++i) {
    const numTasks = tasksPerWorker - (i < extra_capacity ? 1 : 0);
    console.log(`Spawn worker: play ${numTasks} games`);
    const worker = new Worker(__filename, {
      workerData: {
        numTasks: numTasks,
        enriched: flags.get('enriched')
      },
    });
    worker.on('message', (newFrameTensor) => {
      ++gamesPlayed;
      frameTensor = frameTensor.add(newFrameTensor);
      console.log(
        `Frames: ${frameTensor.frames.length} \
                (${newFrameTensor.frames.length} new)`);
      checkDone();
    });
    worker.on('error', (e) => console.error(e));
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(`Worked stopped with code ${code}`);
      }
      --workersAlive;
      checkDone();
    });
  }
}

function trainParallelWorker() {
  for (let i = 0; i < workerData.numTasks; ++i) {
    parentPort.postMessage(playGame(workerData.enriched));
  }
}

main();