
import { getVector, mul2d } from '../math_utils.js';
import { Strategy } from './strategy.js';

export class RetreatStrategy extends Strategy {
  static create(game, team) {
    return new RetreatStrategy(game, team);
  }

  update() {
    for (let player of this.team.players) {
      player.move(mul2d(getVector(this.team.goalDirection), -10));
    }
  }
}
