const {
  Disc
} = require('../disc.js');
const {
  FIELD_BOUNDS,
  FIELD_BOUNDS_NO_ENDZONES
} = require('../game_params.js');
const {
  getClosestPlayer,
  boundsCheck,
  snapToBounds,
} = require('../game_utils.js');
const {
  add2d,
  dist2d,
  getVector,
  mul2d,
  sub2d,
  sub3d
} =
require('../math_utils.js');
const {
  Strategy
} = require('./strategy.js');

// TODO: Enable using a different behavior from 'chargeForward' for players not
// drafted for pickup duty.
module.exports.ClosestPickupStrategy =
  class ClosestPickupStrategy extends Strategy {
    update() {
      // Strategy expires if the other team has possession.
      if ((!this.game.disc.isLoose() || this.game.disc.grounded)
        && !this.team.onOffense) {
        return true;
      }

      if (this.game.disc.isLoose()) {
        const discTarget =
          this.game.disc.grounded
          ? this.game.disc.position
          : Disc.simulateUntilCatchable(this.game.disc.position,
            this.game.disc.velocity,
            this.game.disc.upVector)
          .finalPosition;

        const [closestPlayer] = getClosestPlayer(this.team.players,
          discTarget);

        for (let player of this.team.players) {
          if (player == closestPlayer) {
            this.move(player, discTarget);
          } else {
            this.chargeForward(player);
          }
        }
      } else {
        const playerWithDisc = this.game.playerWithDisc();
        if (boundsCheck(playerWithDisc.position, FIELD_BOUNDS_NO_ENDZONES)) {
          // We caught the disc in-bounds! Strategy expires.
          return true;
        } else {
          // We need to bring the disc back into bounds.
          for (let player of this.team.players) {
            if (player == playerWithDisc) {
              const moveTarget =
                snapToBounds(playerWithDisc.position,
                  FIELD_BOUNDS_NO_ENDZONES);
              this.move(playerWithDisc, moveTarget);
            } else {
              this.chargeForward(player);
            }
          }
        }
      }
    }
  }