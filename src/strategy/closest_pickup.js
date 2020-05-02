
import {Disc} from '../disc.js';
import {FIELD_BOUNDS, FIELD_BOUNDS_NO_ENDZONES, Game} from '../game.js';
import {add2d, dist2d, getVector, mul2d, sub2d, sub3d} from '../math_utils.js';

import {Strategy} from './strategy.js';

export class ClosestPickupStrategy extends Strategy {
  update() {
    // Strategy expires if the other team has possession.
    if ((!this.game.disc.isLoose() || this.game.disc.grounded) &&
        !this.team.onOffense) {
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

      const [closestPlayer] =
          Game.getClosestPlayer(this.team.players, discTarget);

      for (let player of this.team.players) {
        if (player == closestPlayer) {
          this.move(player, discTarget);
        } else {
          this.chargeForward(player);
        }
      }
    } else {
      const playerWithDisc = this.game.playerWithDisc();
      if (Game.boundsCheck(playerWithDisc.position, FIELD_BOUNDS_NO_ENDZONES)) {
        // We caught the disc in-bounds! Strategy expires.
        return true;
      } else {
        // We need to bring the disc back into bounds.
        for (let player of this.team.players) {
          if (player == playerWithDisc) {
            const moveTarget = Game.snapToBounds(playerWithDisc.position,
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