
import { Strategy } from './strategy.js';

function getVector(goalDirection) {
  switch(goalDirection) {
    case 'E':
      return [10, 0];
    case 'W':
      return [-10, 0];
  }
}

export class ChargeStrategy extends Strategy {
  static create(game, team) {
    return new ChargeStrategy(game, team);
  }

  update() {
    for (let player of this.team.players) {
      player.move(getVector(this.team.goalDirection));
    }
  }
}
