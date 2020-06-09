const tf = require('@tensorflow/tfjs');

const {
  add2d
} = require('../math_utils.js');
const {
  FrameTensor
} = require('../frame_tensor.js');
const {
  Strategy
} = require('./strategy.js');

// Run inference every N steps
const INFERENCE_STEP = 10;

module.exports.ModelStrategy = class ModelStrategy extends Strategy {
  constructor(model, game, team) {
    super(game, team);
    this.model = model;
    this.teamNumber = this.team === this.game.teams[1] ? 1 : 0;
    this.frameTensor = new FrameTensor();

    this.actionMap = new Map;
    this.frame = 0;
  }

  update() {
    if (++this.frame % INFERENCE_STEP === 0) {
      this.actionMap = new Map;
      this.frameTensor.recordGameState(this.game);
      const inputs = this.frameTensor.getPermutedInputs(this.teamNumber);
      for (let p = 0; p < this.team.players.length; ++p) {
        const player = this.team.players[p];
        // TODO: Make all predictions with a single call to model.predict
        const prediction = this.model.predict(inputs[p]);
        // DEBUG: console.log(prediction.as1D().arraySync());
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
            this.actionMap.set(player, ['throw', params]);
          } else {
            player.rest();
          }
        } else if (!player.hasDisc && moveAction > restAction) {
          this.move(player, add2d(player.position, [moveX, moveY]));
          this.actionMap.set(player, ['move', [moveX, moveY]]);
        } else {
          player.rest();
        }
      }
      this.frameTensor.recordActions(this.game, this.actionMap);
      this.frameTensor.nextFrame();
    } else {
      // Replace actions from previous model evaluation.
      for (let player of this.team.players) {
        if (this.actionMap.has(player)) {
          const [previousAction, params] = this.actionMap.get(player);
          if (previousAction === 'move') {
            this.move(player, add2d(player.position, params));
          } else {
            player.rest();
          }
        } else {
          player.rest();
        }
      }
    }
  }
}