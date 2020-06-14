const tf = require('@tensorflow/tfjs');

const {
  add2d
} = require('../math_utils.js');
const {
  Coach
} = require('../coach.js');
const {
  FrameTensor
} = require('../frame_tensor.js');
const {
  Strategy
} = require('./strategy.js');
const {
  snapToBounds
} = require('../game_utils.js');
const {
  FIELD_BOUNDS
} = require('../game_params.js');

// Run inference once every STEP, start over every CYCLE.
const INFERENCE_CYCLE = 14;
const INFERENCE_STEP = 2;

module.exports.SingleModelStrategy =
  class SingleModelStrategy extends Strategy {
    constructor(models, game, team) {
      super(game, team);
      this.models = models;
      this.teamNumber = this.team === this.game.teams[1] ? 1 : 0;
      this.frameTensor = new FrameTensor();

      this.actionMap = new Map;
      this.frameCount = 0;

      // Record one frame of 'rest' actions to avoid null 'last_action' values.
      this.frameTensor.recordGameState(this.game);
      this.frameTensor.recordActions(this.game, this.actionMap);
      this.frameTensor.nextFrame();
      this.frameTensor.clearFrames();

      for (let model of models) {
        if (!(model instanceof tf.GraphModel)) {
          throw new Error(`Invalid model input: ${model}`);
        }
      }
    }

    update() {
      this.frameTensor.recordGameState(this.game);
      ++this.frameCount;
      for (let p = 0; p < this.team.players.length; ++p) {
        const player = this.team.players[p];
        if ((this.frameCount + p * INFERENCE_STEP) % INFERENCE_CYCLE === 0) {
          this.actionMap.delete(player);
          const inputs = this.frameTensor.getPermutedInputs(this.teamNumber);
          const model = this.models[p % this.models.length];
          const prediction = model.predict(inputs[p]);
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
            const moveTarget = snapToBounds(
              add2d(player.position, [moveX, moveY]), FIELD_BOUNDS);
            this.move(player, moveTarget);
            this.actionMap.set(player, ['move', [moveX, moveY]]);
          } else {
            player.rest();
          }
        } else {
          // Replay actions from previous model evaluation.
          if (this.actionMap.has(player)) {
            const [previousAction, params] = this.actionMap.get(player);
            if (previousAction === 'move') {
              const moveTarget =
                snapToBounds(add2d(player.position, params), FIELD_BOUNDS);
              this.move(player, moveTarget);
            } else {
              player.rest();
            }
          } else {
            player.rest();
          }
        }
      }
      this.frameTensor.recordActions(this.game, this.actionMap);
      this.frameTensor.nextFrame();
    }

    static coach(models) {
      if (!models instanceof Array) {
        throw new Error(`Illegal input: ${models}`);
      }
      const strategyPicker = (game, team) => new SingleModelStrategy(models,
        game,
        team);
      // TODO: Use strategyPicker for kickoffStrategy as well
      return new Coach(strategyPicker, strategyPicker, strategyPicker);
    }
  }