
import { add2d, dist2d, mul2d, sub2d, sub3d, getVector } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game, FIELD_BOUNDS, FIELD_BOUNDS_NO_ENDZONES } from '../game.js';
import { Strategy } from './strategy.js';
import { ARM_HEIGHT } from '../player.js';

export class ClosestPickupStrategy extends Strategy {
  update() {
    // Strategy expires if the other team has possession.
    if ((!this.game.disc.isLoose() || this.game.disc.grounded) && !this.team.onOffense) { return true; }

    if (this.game.disc.isLoose()) {
      const discTarget = this.game.disc.grounded
          ? this.game.disc.position
          : Disc.simulateUntilGrounded(
                sub3d(this.game.disc.position, [0, 0, ARM_HEIGHT]),
                this.game.disc.velocity,
                this.game.disc.upVector)[0];

      const [closestPlayer] = Game.getClosestPlayer(this.team.players, discTarget);

      for (let player of this.team.players) {
        if (player == closestPlayer) {
          this.move(player, discTarget);
        } else {
          // Charge forwards blindly!
          // TODO: replace with something smarter?
          const moveTarget = Game.snapToBounds(
              add2d(player.position, mul2d(getVector(this.team.goalDirection), 10)),
              FIELD_BOUNDS);
          this.move(player, moveTarget);
        }
      }
    } else {
      // Either we caught the disc in-bounds (success! strategy expires) or we
      // need to bring it back into bounds.
      const playerWithDisc = this.game.playerWithDisc();
      if (Game.boundsCheck(playerWithDisc.position, FIELD_BOUNDS_NO_ENDZONES)) {
        return true;
      } else {
        const moveTarget = Game.snapToBounds(playerWithDisc.position, FIELD_BOUNDS_NO_ENDZONES);
        this.move(playerWithDisc, moveTarget);
      }
    }
  }
}
