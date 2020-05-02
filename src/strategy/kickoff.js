
import {getVector, mag2d, mul2d, sub2d} from '../math_utils.js';
import {MAX_THROW_SPEED} from '../player.js';

import {Strategy} from './strategy.js';

export class KickoffStrategy extends Strategy {
  constructor(game, team) {
    super(game, team);
    this.delay = 30;
  }

  update() {
    // Delay before kickoff
    if (this.delay-- > 0) {
      return;
    }

    if (!this.team.hasDisc()) {
      console.log('Cannot pull without the disc!');
      return true;
    }
    const playerWithDisc = this.game.playerWithDisc();
    if (!playerWithDisc) {
      console.log('No player has the disc!!!');
      return true;
    }
    const target = this.team.goalDirection === 'W' ? [ 10, Math.random() * 40 ]
                                                   : [ 90, Math.random() * 40 ];
    const params = playerWithDisc.rangeFinder.getLongestThrowParams(
        sub2d(target, playerWithDisc.position));
    playerWithDisc.throw(...params);
    return true;
  }
}
