
import {getVector, mag2d, mul2d, sub2d} from '../math_utils.js';
import {MAX_THROW_SPEED} from '../player.js';

import {Strategy} from './strategy.js';

const DELAY_TIME = 1.0;

export class KickoffStrategy extends Strategy {
  constructor(game, team) { super(game, team); }

  update() {
    // Delay before kickoff
    if (this.game.stateTime < DELAY_TIME) {
      for (let player of this.team.players) {
        player.rest(getVector(this.team.goalDirection));
      }
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