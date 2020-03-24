
import { sub2d } from '../math_utils.js';
import { Matchup } from './matchup.js';
import { Strategy } from './strategy.js';

export class ManToManDefenseStrategy extends Strategy {
  static create(game, team) {
    return new ManToManDefenseStrategy(game, team);
  }

  constructor(game, team) {
    super(game, team);
    this.matchup = Matchup.minMeanSquaredDistance(game.teams);
  }

  update() {
    if (this.team.onOffense) { return true; }

    for (let player of this.team.players) {
      const match = this.matchup.get(player);
      if (!match) { console.log('Player has no matchup!'); continue; }
      player.move(sub2d(match.position, player.position));
    }
  }
}
