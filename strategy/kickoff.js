
import { getVector, mag2d, mul2d, sub2d } from '../math_utils.js';
import { Strategy } from './strategy.js';

export class KickoffStrategy extends Strategy {
  static create(game, team) {
    return new KickoffStrategy(game, team);
  }

  update() {
    if (!this.team.hasDisc()) { console.log('Cannot pull without the disc!'); return true; }
    const playerWithDisc = this.game.playerWithDisc();
    if (!playerWithDisc) { console.log('No player has the disc!!!'); return true; }
    const target = this.team.goalDirection === 'W' ? [10, Math.random() * 40] : [100, Math.random() * 40];
    const vector2d = sub2d(target, playerWithDisc.position);
    const vector = mul2d(vector2d, 5 / mag2d(vector2d)).concat(5);
    playerWithDisc.throw(vector);
    return true;
  }
}
