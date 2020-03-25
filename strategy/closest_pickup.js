
import { dist2d, mul2d, sub2d, getVector } from '../math_utils.js';
import { Strategy } from './strategy.js';
import { Disc } from '../disc.js';

export class ClosestPickupStrategy extends Strategy {
  static create(game, team) {
    return new ClosestPickupStrategy(game, team);
  }

  update() {
    // Strategy expires when disc is picked up
    if (!this.game.disc.position) { return true; }
    // Strategy expires if the other team has possession
    if (this.game.disc.grounded && !this.team.onOffense) { return true; }

    let target;
    if (this.game.disc.grounded) {
      target = this.game.disc.position;
    } else {
      [target] = Disc.simulateUntilGrounded(this.game.disc.position, this.game.disc.velocity);
    }

    // Determine closest player
    let closestPlayer;
    let closestDist;
    for (let player of this.team.players) {
      if (this.game.lastThrower == player) { continue; }
      // Note that we can use 3d disc.position as a 2d position; z coord is ignored
      let dist = dist2d(player.position, target);
      if (!closestPlayer || dist < closestDist) {
        closestPlayer = player;
        closestDist = dist;
      }
    }

    for (let player of this.team.players) {
      if (player == closestPlayer) {
        player.move(sub2d(target, player.position));
      } else {
        player.move(mul2d(getVector(this.team.goalDirection), 10));
      }
    }
  }
}
