
const {dist2d, getVector, sub2d} = require('../math_utils.js');
const {NUM_PLAYERS} = require('../team.js');
const {Strategy} = require('./strategy.js');

const LINEUP_RADIUS = 0.5;

module.exports.LineupStrategy = class LineupStrategy extends Strategy {
  update() {
    const playersCopy = this.team.players.slice();
    playersCopy.sort((a, b) => a.position[1] - b.position[1]);
    for (let [index, player] of playersCopy.entries()) {
      let target = this.team.goalDirection === 'E'
                       ? [ 19, (index + 0.5) / NUM_PLAYERS * 40 ]
                       : [ 91, (index + 0.5) / NUM_PLAYERS * 40 ];
      this.moveWithin(player, target, LINEUP_RADIUS,
                      getVector(this.team.goalDirection));
    }
  }
}
