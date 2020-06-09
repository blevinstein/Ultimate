const tf = require('@tensorflow/tfjs');

const {
  STATES
} = require('./game_params.js');

const INTERESTING_STATES = [
  STATES.Pickup, STATES.Normal, STATES.Receiving, STATES.Kickoff
];
const ONE_HOT_COLUMNS = ['state', 'action'];
const BINARY_COLUMNS = ['offensiveGoalDirection'];
const OUTPUT_ONLY_COLUMNS = [
  'action',
  'move_x',
  'move_y',
  'throw_x',
  'throw_y',
  'throw_z',
  'throw_angleOfAttack',
  'throw_tiltAngle',
];

const VOCABULARIES = new Map([
  ['state', INTERESTING_STATES],
  ['action', ['rest', 'move', 'throw']],
  ['offensiveGoalDirection', ['E', 'W']]
]);
const NONE_VALUE = '';

// Encodes a value using a list of enum values.
function encodeValue(value, vocab) {
  const index = vocab.findIndex(v => v === value);
  if (index < 0) {
    throw new Error(`Unexpected value: ${value}`);
  }
  return index;
}

function encodeOneHot(value, vocab) {
  const index = value ? encodeValue(value, vocab) : -1;
  let result = [];
  for (let i = 0; i < vocab.length; ++i) {
    result.push(i === index ? 1 : 0);
  }
  return result;
}

function getLastPart(column, separator = '_') {
  if (!column) {
    throw new Error(`Invalid column: ${column}`);
  }
  let lastPart;
  if (column.includes(separator)) {
    const parts = column.split(separator);
    lastPart = parts[parts.length - 1];
  } else {
    lastPart = column;
  }
  return lastPart;
}

// Enumerated values are encoded based on the contents of VOCABULARIES.
function getEncoding(column) {
  // Infers encoding vocabulary from the last part of the column name.
  const encodingKey = getLastPart(column);
  return VOCABULARIES.has(encodingKey)
    ? value => encodeValue(value, VOCABULARIES.get(encodingKey))
    : (value => value);
}

// Stores a tensor representing individual frames of action from a recorded
// game. Raw frames are stored as Map<string, ?>, recording the state and
// actions of all players on the field.
//
// After permutation, these frames are transformed into examples, which contain
// the state of all players on the field, but the actions of a *single* player.
//
// Usage: Record all actions taken during a game:
//
// const game = new Game(...);
// const actionMap = new Map;
// game.recordActions(actionMap);
// const frameTensor = new FrameTensor();
// while (game.state != STATES.GameOver) {
//   frameTensor.recordGameState(game);
//   game.update();
//   frameTensor.recordActions(game, actionMap);
//   frameTensor.nextFrame();
//   actionMap.clear();
// }
//
// Usage: Create a tensor to be used by a model:
//
// const game = new Game(...);
// ...
// const model = new WinnerPredictor(...);
// const frameTensor = new FrameTensor();
// frameTensor.recordGameState(game);
// const predictedAction = model.predict(frameTensor.getPermutedInputs());
// frameTensor.nextFrame();
//
//
module.exports.FrameTensor = class FrameTensor {
  constructor() {
    this.rawKeys = this.allKeys(false);
    this.keySet = new Set(this.rawKeys);

    this.frames = [];
    this.frameValues = new Map;
    this.lastFrameValues = null;
  }

  add(otherTensor) {
    if (this.frameValues.size) {
      throw new Error('Need to call nextFrame() on this');
    }
    if (otherTensor.frameValues.size) {
      throw new Error('Need to call nextFrame() on otherTensor');
    }

    const newTensor = new FrameTensor();
    newTensor.frames = this.frames.concat(otherTensor.frames);
    return newTensor;
  }

  // Given a single frame of raw data, we can permute that data in 14 different
  // ways, to create an example from the perspective of each player.
  // Each permutation is a Map<outputKey, rawKey>.
  generatePermutations(teams = [0, 1]) {
    const permutations = [];
    for (let t of teams) {
      for (let p = 0; p < 7; ++p) {
        // Permute so that team_$t_player_$p becomes team_0_player_0.
        // If $t != 0, we invert offensiveTeam.
        const permutation = new Map([
          ['state', 'state'],
          ['stallCount', 'stallCount'],
          ['offensiveTeam', t === 0 ? 'offensiveTeam'
            : 'defensiveTeam'
          ],
          ['offensiveGoalDirection', 'offensiveGoalDirection'],
          ['disc_x', 'disc_x'],
          ['disc_y', 'disc_y'],
          ['disc_z', 'disc_z'],
          ['action', `team_${t}_player_${p}_action`],
          ['move_x', `team_${t}_player_${p}_move_x`],
          ['move_y', `team_${t}_player_${p}_move_y`],
          ['throw_x', `team_${t}_player_${p}_throw_x`],
          ['throw_y', `team_${t}_player_${p}_throw_y`],
          ['throw_z', `team_${t}_player_${p}_throw_z`],
          ['throw_angleOfAttack',
            `team_${t}_player_${p}_throw_angleOfAttack`
          ],
          ['throw_tiltAngle', `team_${t}_player_${p}_throw_tiltAngle`],
          ['last_action', `last_team_${t}_player_${p}_action`],
          ['last_move_x', `last_team_${t}_player_${p}_move_x`],
          ['last_move_y', `last_team_${t}_player_${p}_move_y`],
          ['last_throw_x', `last_team_${t}_player_${p}_throw_x`],
          ['last_throw_y', `last_team_${t}_player_${p}_throw_y`],
          ['last_throw_z', `last_team_${t}_player_${p}_throw_z`],
          ['last_throw_angleOfAttack',
            `last_team_${t}_player_${p}_throw_angleOfAttack`
          ],
          ['last_throw_tiltAngle',
            `last_team_${t}_player_${p}_throw_tiltAngle`
          ],
          ['team_0_player_0_x', `team_${t}_player_${p}_x`],
          ['team_0_player_0_y', `team_${t}_player_${p}_y`],
          ['team_0_player_0_vx', `team_${t}_player_${p}_vx`],
          ['team_0_player_0_vy', `team_${t}_player_${p}_vy`],
          ['team_0_player_0_hasDisc', `team_${t}_player_${p}_hasDisc`],
        ]);
        for (let teammate = 0; teammate < 7; ++teammate) {
          if (teammate === p) {
            continue;
          }
          const newIndex = teammate < p ? teammate + 1 : teammate;
          permutation.set(`team_0_player_${newIndex}_x`,
            `team_${t}_player_${teammate}_x`);
          permutation.set(`team_0_player_${newIndex}_y`,
            `team_${t}_player_${teammate}_y`);
          permutation.set(`team_0_player_${newIndex}_vx`,
            `team_${t}_player_${teammate}_vx`);
          permutation.set(`team_0_player_${newIndex}_vy`,
            `team_${t}_player_${teammate}_vy`);
          permutation.set(`team_0_player_${newIndex}_hasDisc`,
            `team_${t}_player_${teammate}_hasDisc`);
        }
        for (let opponent = 0; opponent < 7; ++opponent) {
          permutation.set(`team_1_player_${opponent}_x`,
            `team_${1-t}_player_${opponent}_x`);
          permutation.set(`team_1_player_${opponent}_y`,
            `team_${1-t}_player_${opponent}_y`);
          permutation.set(`team_1_player_${opponent}_vx`,
            `team_${1-t}_player_${opponent}_vx`);
          permutation.set(`team_1_player_${opponent}_vy`,
            `team_${1-t}_player_${opponent}_vy`);
          permutation.set(`team_1_player_${opponent}_hasDisc`,
            `team_${1-t}_player_${opponent}_hasDisc`);
        }
        permutations.push(permutation);
      }
    }
    return permutations;
  }

  // Returns the list of keys to be expected in an output file.
  allKeys(permuted) {
    const keys = [
      'state', 'offensiveTeam', 'offensiveGoalDirection', 'stallCount',
      'disc_x', 'disc_y', 'disc_z'
    ];
    if (!permuted) {
      keys.push('defensiveTeam');
    }
    for (let t = 0; t < 2; t++) {
      for (let p = 0; p < 7; p++) {
        keys.push(
          `team_${t}_player_${p}_x`,
          `team_${t}_player_${p}_y`,
          `team_${t}_player_${p}_vx`,
          `team_${t}_player_${p}_vy`,
          `team_${t}_player_${p}_hasDisc`,
        );
        if (!permuted) {
          keys.push(
            `team_${t}_player_${p}_action`,
            `team_${t}_player_${p}_move_x`,
            `team_${t}_player_${p}_move_y`,
            `team_${t}_player_${p}_throw_x`,
            `team_${t}_player_${p}_throw_y`,
            `team_${t}_player_${p}_throw_z`,
            `team_${t}_player_${p}_throw_angleOfAttack`,
            `team_${t}_player_${p}_throw_tiltAngle`,
            `last_team_${t}_player_${p}_action`,
            `last_team_${t}_player_${p}_move_x`,
            `last_team_${t}_player_${p}_move_y`,
            `last_team_${t}_player_${p}_throw_x`,
            `last_team_${t}_player_${p}_throw_y`,
            `last_team_${t}_player_${p}_throw_z`,
            `last_team_${t}_player_${p}_throw_angleOfAttack`,
            `last_team_${t}_player_${p}_throw_tiltAngle`);
        }
      }
    }
    if (permuted) {
      keys.push(
        'action',
        'move_x',
        'move_y',
        'throw_x',
        'throw_y',
        'throw_z',
        'throw_angleOfAttack',
        'throw_tiltAngle',
        'last_action',
        'last_move_x',
        'last_move_y',
        'last_throw_x',
        'last_throw_y',
        'last_throw_z',
        'last_throw_angleOfAttack',
        'last_throw_tiltAngle');
    }
    return keys;
  }

  record(key, value) {
    if (this.frameValues.has(key)) {
      throw new Error(`Duplicate key: ${key}`);
    }
    if (!this.keySet.has(key)) {
      throw new Error(`Unexpected key: ${key}`);
    }
    this.frameValues.set(key, value);
  }

  recordGameState(game) {
    this.record('state', game.state);
    this.record('offensiveTeam', game.teams[1].onOffense ? 1 : 0);
    this.record('defensiveTeam', game.teams[1].onOffense ? 0 : 1);
    this.record('offensiveGoalDirection', game.offensiveTeam()
      .goalDirection);
    this.record('stallCount', game.stallCount);
    for (let t = 0; t < game.teams.length; ++t) {
      for (let p = 0; p < game.teams[t].players.length; ++p) {
        const player = game.teams[t].players[p];
        this.record(`team_${t}_player_${p}_x`, player.position[0]);
        this.record(`team_${t}_player_${p}_y`, player.position[1]);
        this.record(`team_${t}_player_${p}_vx`, player.velocity[0]);
        this.record(`team_${t}_player_${p}_vy`, player.velocity[1]);
        this.record(`team_${t}_player_${p}_hasDisc`, player.hasDisc ? 1
          : 0);
      }
    }
    this.record('disc_x', game.disc.position[0]);
    this.record('disc_y', game.disc.position[1]);
    this.record('disc_z', game.disc.position[2]);
  }

  recordActions(game, actionMap) {
    for (let t = 0; t < game.teams.length; ++t) {
      for (let p = 0; p < game.teams[t].players.length; p++) {
        const player = game.teams[t].players[p];
        // Record actions taken by the player on this frame.
        if (!actionMap.has(player)) {
          this.record(`team_${t}_player_${p}_action`, 'rest');
        } else {
          const [action, detail] = actionMap.get(player);
          this.record(`team_${t}_player_${p}_action`, action);
          if (action === 'move') {
            this.record(`team_${t}_player_${p}_move_x`, detail[0]);
            this.record(`team_${t}_player_${p}_move_y`, detail[1]);
          } else {
            const [velocity, angleOfAttack, tiltAngle] = detail;
            this.record(`team_${t}_player_${p}_throw_x`, velocity[0]);
            this.record(`team_${t}_player_${p}_throw_y`, velocity[1]);
            this.record(`team_${t}_player_${p}_throw_z`, velocity[2]);
            this.record(`team_${t}_player_${p}_throw_angleOfAttack`,
              angleOfAttack);
            this.record(`team_${t}_player_${p}_throw_tiltAngle`, tiltAngle);
          }
        }
        // Also re-record actions taken by the player on the previous frame.
        for (let key of [`team_${t}_player_${p}_action`,
            `team_${t}_player_${p}_move_x`,
            `team_${t}_player_${p}_move_y`,
            `team_${t}_player_${p}_throw_x`,
            `team_${t}_player_${p}_throw_y`,
            `team_${t}_player_${p}_throw_z`,
            `team_${t}_player_${p}_throw_angleOfAttack`,
            `team_${t}_player_${p}_throw_tiltAngle`
          ]) {
          if (this.lastFrameValues && this.lastFrameValues.has(key)) {
            this.record(`last_${key}`, this.lastFrameValues.get(key));
          }
        }
      }
    }
  }

  // Advances to the next frame. Updates lastFrameValues, and reset frameValues
  // so that we can re-populate all fields again.
  nextFrame() {
    this.frames.push(this.frameValues);
    this.lastFrameValues = this.frameValues;
    this.frameValues = new Map;
  }

  // Similar to nextFrame, but values are not saved.
  dropFrame() {
    this.lastFrameValues = this.frameValues;
    this.frameValues = new Map;
  }

  isInteresting(gameState) {
    return INTERESTING_STATES.includes(gameState);
  }

  renderCsvCell(frame, column) {
    const encoding = getEncoding(column);
    return frame.has(column) ? encoding(frame.get(column)) : NONE_VALUE;
  }

  encodeInputs(column, value) {
    if (OUTPUT_ONLY_COLUMNS.includes(column)) {
      return [];
    }
    const encodingKey = getLastPart(column);
    if (ONE_HOT_COLUMNS.includes(encodingKey)) {
      return encodeOneHot(value, VOCABULARIES.get(encodingKey));
    } else if (BINARY_COLUMNS.includes(encodingKey)) {
      return encodeValue(value, VOCABULARIES.get(encodingKey));
    } else {
      return value || 0;
    }
  }

  // Returns an array of tf.Tensor where element i is the world as perceived
  // by player number i on team number 'team'.
  getPermutedInputs(team) {
    const headers = this.allKeys(true);
    const permutedInputs = [];
    for (let permutation of this.generatePermutations([team])) {
      const inputs = headers.flatMap(h =>
        this.encodeInputs(h, this.frameValues.get(permutation.get(h))));
      permutedInputs.push(tf.tensor(inputs, [1, inputs.length]));
    }
    return permutedInputs;
  }

  getPermutedCsvData() {
    const headers = this.allKeys(true);
    const data = [];
    for (let permutation of this.generatePermutations()) {
      for (let i = 0; i < this.frames.length; i++) {
        const frame = this.frames[i];
        if (!this.isInteresting(frame.get('state'))) {
          continue;
        }
        data.push(
          headers.map(h => this.renderCsvCell(frame, permutation.get(h))));
      }
    }
    return [headers, data];
  }

  getFrameCsvData() {
    const headers = this.allKeys(false);
    const data = [];
    for (let i = 0; i < this.frames.length; i++) {
      data.push(headers.map(h => this.renderCsvCell(this.frames[i], h)));
    }
    return [headers, data];
  }

  filter(condition) {
    const newTensor = new FrameTensor();
    newTensor.frames = this.frames.filter(condition);
    return newTensor;
  }
};