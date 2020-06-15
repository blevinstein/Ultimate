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
const MAX_IN_MEMORY_SAMPLES = 200e3;

// Play a single game until completion, and return as a FrameTensor.
function playGame() {
  let frameTensor = new FrameTensor();
  const game = new Game(null, null, [
    new Coach(),
    new Coach(undefined, (game, team) => new ZoneDefenseStrategy(game,
      team))
  ]);
  const actionMap = new Map;

  game.recordActions(actionMap);

  // Record one frame of 'rest' actions to avoid null 'last_action' values.
  frameTensor.recordGameState(game);
  frameTensor.recordActions(game, actionMap);
  frameTensor.nextFrame();
  frameTensor.clearFrames();

  while (game.state != STATES.GameOver) {
    frameTensor.recordGameState(game);
    game.update();
    frameTensor.recordActions(game, actionMap);
    frameTensor.nextFrame();
    actionMap.clear();
  }

  return frameTensor.getPermutedCsvData();
}

function writeCutterOutput(headers, data) {
  if (flags.get('cutter_output') !== '') {
    writeOutput(flags.get('cutter_output'), headers, data);
  } else {
    console.log('Not writing cutter samples.');
  }
}

function writeThrowerOutput(headers, data) {
  if (flags.get('thrower_output') !== '') {
    writeOutput(flags.get('thrower_output'), headers, data);
  } else {
    console.log('Not writing thrower samples.');
  }
}

function writeOutput(file, headers, data) {
  if (data.length === 0) {
    return;
  }
  console.log(
    `Writing data (shape ${data[0].length} x ${data.length}) to ${file}`);
  writeToFile(file, headers, data);
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
    'num_workers',
    3,
    'Number of worker threads to use for processing');
  flags.defineString(
    'cutter_output',
    'data/cutter_examples.csv',
    'File to store permuted cutter training data in CSV format');
  flags.defineString(
    'thrower_output',
    'data/thrower_examples.csv',
    'File to store permuted thrower training data in CSV format');
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
  let headers;
  let cutterData = [];
  let throwerData = [];

  for (let i = 0; i < numGames; ++i) {
    const [newHeaders, newCutterData, newThrowerData] = playGame();
    headers = headers || newHeaders;
    if (flags.get('cutter_output') !== '') {
      cutterData = cutterData.concat(newCutterData)
      console.log(
        `Cutter: ${cutterData.length} \t (${newCutterData.length} new)`);
    }
    if (flags.get('thrower_output') !== '') {
      throwerData = throwerData.concat(newThrowerData);
      console.log(
        `Thrower: ${throwerData.length} \t (${newThrowerData.length} new)`);
    }
    if (cutterData.length + throwerData.length > MAX_IN_MEMORY_SAMPLES) {
      writeCutterOutput(headers, cutterData);
      writeThrowerOutput(headers, throwerData);
      cutterData = [];
      throwerData = [];
    }
  }

  writeCutterOutput(headers, cutterData);
  writeThrowerOutput(headers, throwerData);
}

function trainParallel(numGames) {
  const numWorkers = flags.get('num_workers');

  let headers;
  let cutterData = [];
  let throwerData = [];
  let gamesPlayed = 0;

  const maybeWrite = () => {
    if (cutterData.length + throwerData.length > MAX_IN_MEMORY_SAMPLES
      || gamesPlayed === numGames) {
      writeCutterOutput(headers, cutterData);
      writeThrowerOutput(headers, throwerData);
      cutterData = [];
      throwerData = [];
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
        numTasks
      },
    });
    worker.on('message', (newMessage) => {
      ++gamesPlayed;
      const [newHeaders, newCutterData, newThrowerData] = newMessage;
      headers = headers || newHeaders;
      if (flags.get('cutter_output') !== '') {
        cutterData = cutterData.concat(newCutterData)
        console.log(
          `Cutter: ${cutterData.length} \t (${newCutterData.length} new)`);
      }
      if (flags.get('thrower_output') !== '') {
        throwerData = throwerData.concat(newThrowerData);
        console.log(
          `Thrower: ${throwerData.length} \t (${newThrowerData.length} new)`
        );
      }
      maybeWrite();
    });
    worker.on('error', (e) => console.error(e));
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.log(`Worked stopped with code ${code}`);
      }
    });
  }
}

function trainParallelWorker() {
  for (let i = 0; i < workerData.numTasks; ++i) {
    parentPort.postMessage(playGame());
  }
}

main();