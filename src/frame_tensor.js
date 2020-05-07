const {
  STATES
} = require('./game_params.js');

module.exports.FrameTensor = class FrameTensor {
  constructor(withOutput = true) {
    this.withOutput = withOutput;

    this.rawKeys = this.allKeys(false);
    this.keySet = new Set(this.rawKeys);

    this.frames = [];
    this.frameValues = new Map;
  }

  add(otherTensor) {
    if (this.withOutput !== otherTensor.withOutput) {
      throw Error('Tensors are not compatible');
    }
    if (this.frameValues.size) {
      throw new Error('Need to call nextFrame() on this');
    }
    if (otherTensor.frameValues.size) {
      throw new Error('Need to call nextFrame() on otherTensor');
    }

    const newTensor = new FrameTensor(this.withOutput);
    newTensor.frames = this.frames.concat(otherTensor.frames);
    return newTensor;
  }

  // Given a single frame of raw data, we can permute that data in 14 different
  // ways, to create an example from the perspective of each player.
  // Each permutation is a Map<outputKey, rawKey>.
  generatePermutations() {
    const permutations = [];
    for (let t = 0; t < 2; ++t) {
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
          ['team_0_player_0_x', `team_${t}_player_${p}_x`],
          ['team_0_player_0_y', `team_${t}_player_${p}_y`],
          ['team_0_player_0_vx', `team_${t}_player_${p}_vx`],
          ['team_0_player_0_vy', `team_${t}_player_${p}_vy`],
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
        }
        permutations.push(permutation);
      }
    }
    return permutations;
  }

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
        );
        if (this.withOutput && !permuted) {
          keys.push(
            `team_${t}_player_${p}_action`,
            `team_${t}_player_${p}_move_x`,
            `team_${t}_player_${p}_move_y`,
            `team_${t}_player_${p}_throw_x`,
            `team_${t}_player_${p}_throw_y`,
            `team_${t}_player_${p}_throw_z`,
            `team_${t}_player_${p}_throw_angleOfAttack`,
            `team_${t}_player_${p}_throw_tiltAngle`,
          );
        }
      }
    }
    if (this.withOutput && permuted) {
      keys.push(
        'action',
        'move_x',
        'move_y',
        'throw_x',
        'throw_y',
        'throw_z',
        'throw_angleOfAttack',
        'throw_tiltAngle',
      );
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

  encodeAction(action) {
    switch (action) {
      case 'rest':
        return 0;
      case 'move':
        return 1;
      case 'throw':
        return 2;
      default:
        throw new Error(`Unexpected action: ${action}`);
    }
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
        if (!actionMap.has(player)) {
          this.record(`team_${t}_player_${p}_action`, this.encodeAction(
            'rest'));
        } else {
          const [action, detail] = actionMap.get(player);
          this.record(`team_${t}_player_${p}_action`, this.encodeAction(
            action));
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
      }
    }
  }

  nextFrame() {
    this.frames.push(this.frameValues);
    this.frameValues = new Map;
  }

  dropFrame() {
    this.frameValues = new Map;
  }

  getPermutedCsvData() {
    const headers = this.allKeys(true);
    const data = [headers];
    for (let permutation of this.generatePermutations()) {
      for (let i = 0; i < this.frames.length; i++) {
        data.push(headers.map(h =>
          this.frames[i].has(permutation.get(h))
          ? this.frames[i].get(permutation.get(h))
          : ''));
      }
    }
    return data;
  }

  getFrameCsvData() {
    const headers = this.allKeys(false);
    const data = [headers];
    for (let i = 0; i < this.frames.length; i++) {
      data.push(headers.map(
        h => this.frames[i].has(h) ? this.frames[i].get(h) : ''));
    }
    return data;
  }
};