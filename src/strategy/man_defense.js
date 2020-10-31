const {
  Disc
} = require('../disc.js');
const {
  FIELD_BOUNDS
} = require('../game_params.js');
const {
  getClosestPlayer,
  snapToBounds,
} = require('../game_utils.js');
const {
  add2d,
  dist2d,
  getVector,
  mul2d,
  norm2d,
  sub2d,
  sub3d
} =
require('../math_utils.js');
const {
  Matchup
} = require('./matchup.js');
const {
  Strategy
} = require('./strategy.js');

const MARK_RADIUS = 0.5;
const MIN_DISC_SPACE = 2.5;

module.exports.ManToManDefenseStrategy =
  class ManToManDefenseStrategy extends Strategy {
    constructor(game, team) {
      super(game, team);
      this.matchup = Matchup.minMeanSquaredDistance(game.teams);
      this.forceDirection = Math.random() < 0.5 ? getVector('N') : getVector(
        'S');
      this.offset = add2d(mul2d(getVector(team.goalDirection), -8),
        mul2d(this.forceDirection, 5));
      this.markOffset = add2d(mul2d(getVector(team.goalDirection), -3),
        mul2d(this.forceDirection, -2));
    }

    update() {
      if (this.team.onOffense) {
        return true;
      }

      const discTarget =
        this.game.disc.grounded
        ? add2d(this.game.disc.position, this.markOffset)
        : Disc.simulateUntilCatchable(this.game.disc.position,
          this.game.disc.velocity,
          this.game.disc.upVector)
        .finalPosition;

      const interceptor = this.game.disc.isLoose()
        && getClosestPlayer(this.team.players, discTarget)[0];

      for (let player of this.team.players) {
        if (player == interceptor) {
          this.move(player, discTarget);
        } else {
          const match = this.matchup.get(player);
          if (!match) {
            console.log('Player has no matchup!');
            continue;
          }
          let target =
            snapToBounds(add2d(match.position,
                match.hasDisc ? this.markOffset : this.offset),
              FIELD_BOUNDS);
          // Adjust target to give disc space if necessary
          if (dist2d(target, match.position) < MIN_DISC_SPACE) {
            target = mul2d(norm2d(sub2d(target, match.position)),
              MIN_DISC_SPACE);
          }
          this.moveWithin(player, target, MARK_RADIUS,
            sub2d(match.position, player.position));
        }
      }
    }
  }
