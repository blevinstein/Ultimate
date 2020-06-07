const {
  FrameTensor
} = require('./frame_tensor.js');
const {
  Strategy
} = require('./strategy.js');

module.exports.ModelStrategy = class ModelStrategy extends Strategy {
  constructor(model, game, team) {
    super(game, team);
    this.model = model;
  }

  update() {
    const frameTensor = new FrameTensor(false);
    frameTensor.recordGameState(this.game);
    // TODO: get actions from model
    for (let player of this.team.players) {
      player.rest();
    }
  }
}
