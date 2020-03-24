
import { Strategy } from './strategy.js';

function getVector(goalDirection) {
  switch(goalDirection) {
    case 'E':
      return [-10, 0];
    case 'W':
      return [10, 0];
  }
}

export class RetreatStrategy extends Strategy {
  static create(game, team) {
    return new RetreatStrategy(game, team);
  }

  update() {
    for (let player of this.team.players) {
      player.move(getVector(this.team.goalDirection));
    }
  }
}
