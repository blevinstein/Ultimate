
import { getVector, mag2d, mul2d, sub2d } from '../math_utils.js';
import { Strategy } from './strategy.js';

export class KickoffStrategy extends Strategy {
  static create(game, team) {
    return new KickoffStrategy(game, team);
  }

  constructor(game, team) {
    super(game, team);
    this.delay = 30;
  }

  update() {
    // Delay before kickoff
    if (this.delay-- > 0) { return; }

    if (!this.team.hasDisc()) { console.log('Cannot pull without the disc!'); return true; }
    const playerWithDisc = this.game.playerWithDisc();
    if (!playerWithDisc) { console.log('No player has the disc!!!'); return true; }
    const target = this.team.goalDirection === 'W' ? [10, Math.random() * 40] : [100, Math.random() * 40];
    const vector2d = sub2d(target, playerWithDisc.position);
    const forward = Math.random() * 2 + 1;
    const upward = Math.random() * 2 + 1;
    const vector = mul2d(vector2d, forward / mag2d(vector2d)).concat(upward);
    playerWithDisc.throw(vector);
    return true;
  }
}
