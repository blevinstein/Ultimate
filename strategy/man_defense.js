
import { getVector, add2d, mul2d, sub2d } from '../math_utils.js';
import { Matchup } from './matchup.js';
import { Strategy } from './strategy.js';

export class ManToManDefenseStrategy extends Strategy {
  static create(game, team) {
    return new ManToManDefenseStrategy(game, team);
  }

  constructor(game, team) {
    super(game, team);
    this.matchup = Matchup.minMeanSquaredDistance(game.teams);
    this.forceDirection = Math.random() < 0.5 ? getVector('N') : getVector('S');
    this.offset = add2d(
      mul2d(getVector(team.goalDirection), -5),
      mul2d(this.forceDirection, 5));
    this.markOffset = add2d(
      mul2d(getVector(team.goalDirection), -5),
      mul2d(this.forceDirection, -2.5));
  }

  update() {
    if (this.team.onOffense) { return true; }

    for (let player of this.team.players) {
      const match = this.matchup.get(player);
      if (!match) { console.log('Player has no matchup!'); continue; }
      let target = match.hasDisc
          ? add2d(match.position, this.markOffset)
          : add2d(match.position, this.offset);
      player.move(sub2d(target, player.position));
    }
  }
}
