const tf = require('@tensorflow/tfjs');

const {
  FrameTensor
} = require('../frame_tensor.js');
const {
  Strategy
} = require('./strategy.js');

module.exports.ModelStrategy = class ModelStrategy extends Strategy {
  constructor(model, game, team) {
    super(game, team);
    this.model = model;
    this.teamNumber = this.team === this.game.teams[1] ? 1 : 0;
    this.frameTensor = new FrameTensor();
  }

  update() {
    this.frameTensor.recordGameState(this.game);
    const inputs = this.frameTensor.getPermutedInputs(this.teamNumber);
    const actionMap = new Map;
    for (let p = 0; p < this.team.players.length; ++p) {
      const player = this.team.players[p];
      // TODO: Make all predictions with a single call to model.predict
      const prediction = this.model.predict(inputs[p]);
      const [restAction, moveAction, throwAction, moveX, moveY,
        throwX, throwY, throwZ, throwAngleOfAttack, throwTiltAngle
      ] =
      prediction.as1D().arraySync();
      if (player.hasDisc && throwAction > restAction) {
        if (player.canThrow()) {
          const params = [
            [throwX, throwY, throwZ], throwAngleOfAttack, throwTiltAngle
          ];
          this.throwDisc(player, params);
          actionMap.set(player, ['throw', params]);
        } else {
          player.rest();
        }
      } else if (!player.hasDisc && moveAction > restAction) {
        const params = [moveX, moveY];
        this.move(player, params);
        actionMap.set(player, ['move', params]);
      } else {
        player.rest();
      }
    }
    this.frameTensor.recordActions(this.game, actionMap);
    this.frameTensor.nextFrame();
  }
}