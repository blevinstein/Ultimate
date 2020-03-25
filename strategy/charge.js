
import { getVector, mul2d } from '../math_utils.js';
import { Strategy } from './strategy.js';

export class ChargeStrategy extends Strategy {
  static create(game, team) {
    return new ChargeStrategy(game, team);
  }

  update() {
    for (let player of this.team.players) {
      player.move(mul2d(getVector(this.team.goalDirection), 10));
    }
    return true;
  }
}
