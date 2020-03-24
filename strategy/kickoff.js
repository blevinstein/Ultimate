
import { Strategy } from './strategy.js';

function getVector(kickoffDirection) {
  switch(kickoffDirection) {
    case 'E':
      return [4, 2, 5];
    case 'W':
      return [-4, 2, 5];
  }
}

export class KickoffStrategy extends Strategy {
  static create(game, team) {
    return new KickoffStrategy(game, team);
  }

  update() {
    if (!this.team.hasDisc()) { console.log('Cannot pull without the disc!'); return; }
    const playerWithDisc = this.team.players.find(p => p.hasDisc);
    if (!playerWithDisc) { console.log('No player has the disc!!!'); return; }
    const vector = getVector(this.team.goalDirection);
    playerWithDisc.throw(vector);
  }
}
