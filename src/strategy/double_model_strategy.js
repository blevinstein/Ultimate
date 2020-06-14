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

const CUTTER_INDEX = 0;
const THROWER_INDEX = 1;

module.exports.DoubleModelStrategy =
  class DoubleModelStrategy extends Strategy {
    constructor(modelPairs, game, team) {
      super(game, team);
      this.modelPairs = modelPairs;
      this.teamNumber = this.team === this.game.teams[1] ? 1 : 0;
      this.frameTensor = new FrameTensor();

      this.actionMap = new Map;
      this.frameCount = 0;

      // Record one frame of 'rest' actions to avoid null 'last_action' values.
      this.frameTensor.recordGameState(this.game);
      this.frameTensor.recordActions(this.game, this.actionMap);
      this.frameTensor.nextFrame();
      this.frameTensor.clearFrames();

      for (let modelPair of modelPairs) {
        if (modelPair.length !== 2
          || modelPair.some(model => !(model instanceof tf.GraphModel))) {
          throw new Error(`Invalid model pair input: ${modelPair}`);
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

          if (player.hasDisc) {
            if (player.canThrow()) {
              const model = this.modelPairs[p % this.modelPairs.length][
                THROWER_INDEX
              ];
              const prediction = model.predict(inputs[p]);
              const [
                throwAction,
                throwX, throwY, throwZ,
                throwAngleOfAttack,
                throwTiltAngle
              ] = prediction.as1D().arraySync();
              const throwParams = [
                [throwX, throwY, throwZ], throwAngleOfAttack, throwTiltAngle
              ];
              this.throwDisc(player, throwParams);
              this.actionMap.set(player, ['throw', throwParams]);
            } else {
              player.rest();
            }
          } else {
            const model = this.modelPairs[p % this.modelPairs.length][
              CUTTER_INDEX
            ];
            const prediction = model.predict(inputs[p]);
            const [moveX, moveY] = prediction.as1D().arraySync();
            const moveTarget = snapToBounds(
              add2d(player.position, [moveX, moveY]), FIELD_BOUNDS);
            this.move(player, moveTarget);
            this.actionMap.set(player, ['move', [moveX, moveY]]);
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

    static coach(modelPairs) {
      if (!modelPairs instanceof Array) {
        throw new Error(`Illegal input: ${modelPairs}`);
      }
      const strategyPicker = (game, team) =>
        new DoubleModelStrategy(modelPairs, game, team);
      // TODO: Use strategyPicker for kickoffStrategy as well
      return new Coach(strategyPicker, strategyPicker, strategyPicker);
    }
  }