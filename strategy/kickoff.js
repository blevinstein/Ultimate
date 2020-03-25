
import { getVector, mag2d, mul2d, sub2d } from '../math_utils.js';
import { RangeFinder } from '../range_finder.js';
import { Strategy } from './strategy.js';

const MAX_THROW_SPEED = 4;

export class KickoffStrategy extends Strategy {
  static create(game, team) {
    return new KickoffStrategy(game, team);
  }

  constructor(game, team) {
    super(game, team);
    this.delay = 30;
    this.rangeFinder = new RangeFinder(MAX_THROW_SPEED);
  }

  update() {
    // Delay before kickoff
    if (this.delay-- > 0) { return; }

    if (!this.team.hasDisc()) { console.log('Cannot pull without the disc!'); return true; }
    const playerWithDisc = this.game.playerWithDisc();
    if (!playerWithDisc) { console.log('No player has the disc!!!'); return true; }
    const target = this.team.goalDirection === 'W' ? [10, Math.random() * 40] : [100, Math.random() * 40];
    playerWithDisc.throw(this.rangeFinder.getThrowVector(sub2d(target, playerWithDisc.position)));
    return true;
  }
}
