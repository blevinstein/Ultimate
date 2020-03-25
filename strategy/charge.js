
import { getVector, add2d, mul2d, sub2d } from '../math_utils.js';
import { Game } from '../game.js';
import { Strategy } from './strategy.js';

const BOUNDS = [[5, 105], [5, 35]];

export class ChargeStrategy extends Strategy {
  static create(game, team) {
    return new ChargeStrategy(game, team);
  }

  update() {
    for (let player of this.team.players) {
      if (this.team.goalDirection === 'E' && player.position[0] >= 90 && Game.boundsCheck(player.position, BOUNDS)) {
        player.rest(mul2d(getVector(this.team.goalDirection), -1));
      } else if (this.team.goalDirection === 'W' && player.position[0] <= 20 && Game.boundsCheck(player.position, BOUNDS)) {
        player.rest(mul2d(getVector(this.team.goalDirection), -1));
      } else {
        let target = Game.snapToBounds(
            add2d(player.position, mul2d(getVector(this.team.goalDirection), 10)),
            BOUNDS);
        player.move(sub2d(target, player.position));
      }
    }
    return true;
  }
}
