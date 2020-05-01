
import {Strategy} from './strategy.js';

export class IdleStrategy extends Strategy {
  update() {
    for (let player of this.team.players) {
      player.rest();
    }
  }
}
