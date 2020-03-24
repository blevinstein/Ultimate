
import { dist2d, sub2d } from '../math_utils.js';
import { ChargeStrategy } from './charge.js';
import { Strategy } from './strategy.js';

export class ClosestPickupStrategy extends Strategy {
  static create(game, team) {
    return new ClosestPickupStrategy(game, team);
  }

  update() {
    // Strategy expires when disc is picked up
    if (!this.game.disc.position) { return true; }

    // Determine closest player
    let closestPlayer;
    let closestDist;
    for (let player of this.team.players) {
      // Note that we can use 3d disc.position as a 2d position; z coord is ignored
      let dist = dist2d(player.position, this.game.disc.position);
      if (!closestPlayer || dist < closestDist) {
        closestPlayer = player;
        closestDist = dist;
      }
    }

    for (let player of this.team.players) {
      if (player == closestPlayer) {
        player.move(sub2d(this.game.disc.position, player.position));
      } else {
        player.move(ChargeStrategy.getVector(this.team.goalDirection));
      }
    }
  }
}
