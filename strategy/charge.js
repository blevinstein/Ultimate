
import { getVector, mul2d } from '../math_utils.js';
import { Strategy } from './strategy.js';

export class ChargeStrategy extends Strategy {
  static create(game, team) {
    return new ChargeStrategy(game, team);
  }

  update() {
    for (let player of this.team.players) {
      if (this.team.goalDirection === 'E' && player.position[0] >= 90) {
        player.rest(mul2d(getVector(this.team.goalDirection), -1));
      } else if (this.team.goalDirection === 'W' && player.position[0] <= 20) {
        player.rest(mul2d(getVector(this.team.goalDirection), -1));
      } else {
        player.move(mul2d(getVector(this.team.goalDirection), 10));
      }
    }
    return true;
  }
}
