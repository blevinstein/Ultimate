const fs = require('fs');
const stringify = require('csv-stringify');

const {
  STATES
} = require('./game_params.js');

module.exports.FrameTensor = class FrameTensor {
  constructor(withOutput = true) {
    this.headers = this.allKeys(withOutput);
    this.headerSet = new Set(this.headers);

    this.frames = [];

    this.frameValues = new Map;
  }

  allKeys(withOutput) {
    const keys = ['state', 'offensiveTeam', 'stallCount', 'disc_x',
      'disc_y', 'disc_z'
    ];
    for (let t = 0; t < 2; t++) {
      for (let p = 0; p < 7; p++) {
        keys.push(
          `team_${t}_player_${p}_x`,
          `team_${t}_player_${p}_y`,
          `team_${t}_player_${p}_vx`,
          `team_${t}_player_${p}_vy`,
        );
        if (withOutput) {
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
    return keys;
  }

  record(key, value) {
    if (this.frameValues.has(key)) {
      throw new Error(`Duplicate key: ${key}`);
    }
    if (!this.headerSet.has(key)) {
      throw new Error(`Unexpected key: ${key}`);
    }
    this.frameValues.set(key, value);
  }

  recordGameState(game) {
    this.record('state', game.state);
    this.record('offensiveTeam', game.teams[1].onOffense ? 1 : 0);
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

  dumpToFile(filename) {
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
        console.log(
          `Wrote ${this.frames.length} frames to ${filename}`);
      });
    });
    stringifier.write(this.headers);
    for (let i = 0; i < this.frames.length; i++) {
      stringifier.write(this.headers.map(h => this.frames[i].has(h) ? this
        .frames[i].get(h)
        : ''));
    }
    stringifier.end();
  }
};