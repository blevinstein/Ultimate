
import { getVector, add2d, mul2d, sub2d, sub3d } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game, FIELD_BOUNDS } from '../game.js';
import { ARM_HEIGHT } from '../player.js';
import { Matchup } from './matchup.js';
import { Strategy } from './strategy.js';

const MARK_RADIUS = 1;

export class ManToManDefenseStrategy extends Strategy {
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

    const discTarget = this.game.disc.grounded
        ? add2d(this.game.disc.position, this.markOffset)
        : Disc.simulateUntilGrounded(
              sub3d(this.game.disc.position, [0, 0, ARM_HEIGHT]),
              this.game.disc.velocity,
              this.game.disc.upVector)[0];

    const interceptor = this.game.disc.isLoose()
        && Game.getClosestPlayer(this.team.players, discTarget)[0];

    for (let player of this.team.players) {
      if (player == interceptor) {
        player.moveExactly(sub2d(discTarget, player.position));
      } else {
        const match = this.matchup.get(player);
        if (!match) { console.log('Player has no matchup!'); continue; }
        const target = Game.snapToBounds(
            add2d(match.position, match.hasDisc ? this.markOffset : this.offset),
            FIELD_BOUNDS);
        if (dist2d(target, player.position) > MARK_RADIUS) {
          player.moveExactly(sub2d(target, player.position));
        } else {
          player.rest(sub2d(match.position, player.position));
        }
      }
    }
  }
}
