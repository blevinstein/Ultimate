
import { add2d, dist2d, mul2d, sub2d, sub3d, getVector } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game, FIELD_BOUNDS } from '../game.js';
import { Strategy } from './strategy.js';

const HAND_HEIGHT = 3;

export class ClosestPickupStrategy extends Strategy {
  update() {
    // Strategy expires when disc is picked up
    if (!this.game.disc.position) { return true; }
    // Strategy expires if the other team has possession
    if (this.game.disc.grounded && !this.team.onOffense) { return true; }

    const target = this.game.disc.grounded
        ?  this.game.disc.position
        : Disc.simulateUntilGrounded(
              sub3d(this.game.disc.position, [0, 0, HAND_HEIGHT]),
              this.game.disc.velocity)[0];

    const [closestPlayer] = Game.getClosestPlayer(this.team.players, target);

    for (let player of this.team.players) {
      if (player == closestPlayer) {
        player.move(sub2d(target, player.position));
      } else {
        let target = Game.snapToBounds(
            add2d(player.position, mul2d(getVector(this.team.goalDirection), 10)),
            FIELD_BOUNDS);
        player.move(sub2d(target, player.position));
      }
    }
  }
}
