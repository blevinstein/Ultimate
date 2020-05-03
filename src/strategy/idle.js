const {
  Strategy
} = require('./strategy.js');

module.exports.IdleStrategy = class IdleStrategy extends Strategy {
  update() {
    for (let player of this.team.players) {
      player.rest();
    }
  }
}