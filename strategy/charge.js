
import { Strategy } from './strategy.js';

export class ChargeStrategy extends Strategy {
  static create(game, team) {
    return new ChargeStrategy(game, team);
  }

  static getVector(goalDirection) {
    switch(goalDirection) {
      case 'E':
        return [10, 0];
      case 'W':
        return [-10, 0];
    }
  }

  update() {
    for (let player of this.team.players) {
      player.move(ChargeStrategy.getVector(this.team.goalDirection));
    }
    return true;
  }
}
