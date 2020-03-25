
import { getVector, mul2d } from '../math_utils.js';
import { Strategy } from './strategy.js';

export class KickoffStrategy extends Strategy {
  static create(game, team) {
    return new KickoffStrategy(game, team);
  }

  update() {
    if (!this.team.hasDisc()) { console.log('Cannot pull without the disc!'); return true; }
    const playerWithDisc = this.team.players.find(p => p.hasDisc);
    if (!playerWithDisc) { console.log('No player has the disc!!!'); return true; }
    const vector = mul2d(getVector(this.team.goalDirection), 5).concat(5);
    playerWithDisc.throw(vector);
    return true;
  }
}
