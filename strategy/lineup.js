
import { sub2d } from '../math_utils.js';
import { NUM_PLAYERS } from '../team.js';
import { Strategy } from './strategy.js';

export class LineupStrategy extends Strategy {
  update() {
    const playersCopy = this.team.players.slice();
    playersCopy.sort((a, b) => a.position[1] - b.position[1]);
    for (let [index, player] of playersCopy.entries()) {
      let target = this.team.goalDirection === 'E'
          ? [19, (index+0.5) / NUM_PLAYERS * 40]
          : [91, (index+0.5) / NUM_PLAYERS * 40];
      player.move(sub2d(target, player.position));
    }
  }
}
