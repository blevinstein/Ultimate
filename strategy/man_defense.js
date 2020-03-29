
import { getVector, add2d, mul2d, norm2d, sub2d, sub3d } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game, FIELD_BOUNDS } from '../game.js';
import { ARM_HEIGHT } from '../player.js';
import { Matchup } from './matchup.js';
import { Strategy } from './strategy.js';

const MARK_RADIUS = 0.5;
const MIN_DISC_SPACE = 2.5;

export class ManToManDefenseStrategy extends Strategy {
  constructor(game, team) {
    super(game, team);
    this.matchup = Matchup.minMeanSquaredDistance(game.teams);
    this.forceDirection = Math.random() < 0.5 ? getVector('N') : getVector('S');
    this.offset = add2d(
      mul2d(getVector(team.goalDirection), -8),
      mul2d(this.forceDirection, 5));
    this.markOffset = add2d(
      mul2d(getVector(team.goalDirection), -3),
      mul2d(this.forceDirection, -2));
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
        player.moveTo(discTarget);
      } else {
        const match = this.matchup.get(player);
        if (!match) { console.log('Player has no matchup!'); continue; }
        let target = Game.snapToBounds(
            add2d(match.position, match.hasDisc ? this.markOffset : this.offset),
            FIELD_BOUNDS);
        // Give disc space if necessary
        if (dist2d(target, match.position) < MIN_DISC_SPACE) {
          target = mul2d(norm2d(sub2d(target, match.position)), MIN_DISC_SPACE);
        }
        if (dist2d(target, player.position) > MARK_RADIUS) {
          player.moveTo(target);
        } else {
          player.rest(sub2d(match.position, player.position));
        }
      }
    }
  }
}
