
import { Strategy } from './strategy.js';

export class IdleStrategy extends Strategy {
  static create(game, team) {
    return new IdleStrategy(game, team);
  }

  update() {
    for (let player of this.team.players) {
      player.rest();
    }
  }
}
