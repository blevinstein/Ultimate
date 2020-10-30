const {
  Disc
} = require('../disc.js');
const {
  drawPath
} = require('../draw_utils.js');
const {
  getClosestPlayer,
  chooseBestRandomDestination
} =
require('../game_utils.js');
const {
  dist2d,
  getVector,
  mag2d,
  magnitudeAlong2d,
  sub2d
} =
require('../math_utils.js');
const {
  ARM_HEIGHT,
  MAX_THROW_SPEED
} = require('../player_params.js');
const {
  Player
} = require('../player.js');
const {
  Strategy
} = require('./strategy.js');

const NUM_CANDIDATE_THROWS = 1;
const GOAL_RADIUS = 2;
const MIN_PROGRESS = 5;
const REACTION_TIME = 2;
const MIN_THROW_STALL_COUNT = 1.5;

// Totally uncoordinated scramble. Players look for open areas of the field,
// from 10m behind the handler to back of the endzone.
module.exports.RandomOffenseStrategy =
  class RandomOffenseStrategy extends Strategy {
    constructor(game, team) {
      super(game, team);
      this.destinationMap = new Map;
      this.pathsConsidered = [];
    }

    update() {
      if (!this.team.onOffense || this.game.disc.isLoose()) {
        return true;
      }

      for (let player of this.team.players) {
        if (player.hasDisc) {
          // Thrower behavior
          if (!player.canThrow() || this.game.stallCount < MIN_THROW_STALL_COUNT) {
            player.rest(getVector(this.team.goalDirection));
            continue;
          }
          const [minX, maxX] = this.team.goalDirection === 'E' ? [player
            .position[0] - 5, 110
          ] : [
            0, player.position[0] + 5
          ];
          let bestDestination;
          let bestForwardProgress;
          let bestParams;
          for (let i = 0; i < NUM_CANDIDATE_THROWS; i++) {
            // Choose a random location no more than 5 yards behind the thrower
            let destination = [minX + Math.random() * (maxX - minX), Math
              .random() * 40
            ];
            let closestDefenderDistance = getClosestPlayer(
              this.game.defensiveTeam().players.filter(p => p != player),
              destination)[1];
            let [closestReceiver, closestReceiverDistance] = getClosestPlayer(
              this.team.players.filter(p => p != player), destination);
            if (closestReceiverDistance > closestDefenderDistance) {
              continue;
            }
            let runTime = REACTION_TIME + Player.simulateRunTime(
              sub2d(destination, closestReceiver.position),
              closestReceiver.velocity);
            let params = player.rangeFinder.getThrowParams(
              sub2d(destination, player.position), runTime);
            if (!params) {
              continue;
            }
            let path = Disc.simulateUntilGrounded(
                this.game.disc.position, params.velocity,
                Disc.createUpVector(params), true)
              .path;
            this.pathsConsidered.push(path);
            let interceptor = Disc.simulateInterceptions(
              this.game.disc.position, params.velocity,
              Disc.createUpVector(params),
              this.game.defensiveTeam().players)[0];
            if (interceptor) {
              // DEBUG: console.log('Defender would intercept throw.');
              continue;
            }
            let forwardProgress =
              magnitudeAlong2d(sub2d(destination, player.position),
                getVector(this.team.goalDirection));
            if (!bestDestination || forwardProgress > bestForwardProgress) {
              bestDestination = destination;
              bestForwardProgress = forwardProgress;
              bestParams = params;
            }
          }
          if (bestDestination && bestForwardProgress > MIN_PROGRESS) {
            this.throwDisc(player, [
              bestParams.velocity, bestParams.angleOfAttack, bestParams
              .tiltAngle
            ]);
          } else {
            player.rest(getVector(this.team.goalDirection));
          }
        } else {
          // Cutter behavior
          let destination = this.destinationMap.get(player)
            || chooseBestRandomDestination(this.game, this.team);
          if (!destination) {
            continue;
          }
          this.moveWithin(player, destination);
          if (dist2d(destination, player.position) <= GOAL_RADIUS) {
            destination = null;
          }
          this.destinationMap.set(player, destination);
        }
      }

      for (let i = 0; i < this.pathsConsidered.length; i++) {
        drawPath(this.frameBuffer, this.pathsConsidered[i],
          Math.pow(0.9, this.pathsConsidered.length - i));
      }
    }
  }
