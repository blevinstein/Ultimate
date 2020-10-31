const {
  Disc
} = require('../disc.js');
const {
  drawPath
} = require('../draw_utils.js');
const {
  chooseBestRandomDestination
} =
require('../game_utils.js');
const {
  dist2d,
  mul2d,
  getVector,
  inverseProject2d,
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

const GOAL_RADIUS = 2;
const REACTION_TIME = 2;

// Totally uncoordinated scramble. Players look for open areas of the field,
// from 10m behind the handler to back of the endzone. Handler throws when and
// where the user clicks.
module.exports.ManualOffenseStrategy =
  class ManualOffenseStrategy extends Strategy {
    constructor(game, team) {
      super(game, team);
      this.destinationMap = new Map;
      this.throwConfirmed = false;
      this.throwTarget = null;
      game.canvas.onclick = event => {
        this.throwConfirmed = true;
      };
      game.canvas.onmousemove = event => {
        this.throwTarget = inverseProject2d(
          mul2d(sub2d([event.offsetX, event.offsetY], game.fieldOffset),
            1 / game.fieldScale));
      };
    }

    update() {
      if (!this.team.onOffense || this.game.disc.isLoose()) {
        return true;
      }

      for (let player of this.team.players) {
        if (player.hasDisc) {
          // Thrower behavior
          if (!this.throwTarget || !player.canThrow()) {
            player.rest(getVector(this.team.goalDirection));
            continue;
          }

          let throwParams = player.rangeFinder.getThrowParams(
            sub2d(this.throwTarget, player.position), /*minRunTime=*/ 0);
          let catchable = !!throwParams;
          if (!throwParams) {
            throwParams = player.rangeFinder.getThrowParams(
              sub2d(this.throwTarget, player.position));
          }
          if (!throwParams) {
            console.log('Fallback to longest throw');
            throwParams = player.rangeFinder.getLongestThrowParams(
              sub2d(this.throwTarget, player.position));
          }
          if (!throwParams) {
            throw new Error('Failed to get throw params!');
          }
          let path = Disc.simulateUntilGrounded(
              this.game.disc.position, throwParams.velocity,
              Disc.createUpVector(throwParams), true)
            .path;
          drawPath(this.frameBuffer, path, 1, catchable ? '#49ff29' : 'red');
          if (this.throwConfirmed) {
            this.throwDisc(player, [
              throwParams.velocity, throwParams.angleOfAttack,
              throwParams.tiltAngle
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
    }
  }
