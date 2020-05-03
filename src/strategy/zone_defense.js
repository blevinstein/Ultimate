const {
  Disc
} = require('../disc.js');
const {
  getClosestPlayer,
  boundsCheck
} = require('../game_utils.js');
const {
  add2d,
  getVector,
  mul2d,
  sub2d,
  sub3d
} = require('../math_utils.js');
const {
  Strategy
} = require('./strategy.js');

const MARK_RADIUS = 0.5;

module.exports.ZoneDefenseStrategy =
  class ZoneDefenseStrategy extends Strategy {
    constructor(game, team) {
      super(game, team);
      this.forceDirection = Math.random() < 0.5 ? getVector('N') : getVector(
        'S');
      let goalDirection = getVector(game.offensiveTeam().goalDirection);

      this.cupOffsets = [
        mul2d(this.forceDirection, -5),
        add2d(mul2d(this.forceDirection, -4), mul2d(goalDirection, 4)),
        mul2d(goalDirection, 6),
        add2d(mul2d(this.forceDirection, 4), mul2d(goalDirection, 4))
      ];
      this.offset = mul2d(goalDirection, 2);
    }

    deepThreatLevel(cutter) {
      return this.game.offensiveTeam().goalDirection === 'E' ? cutter[0]
        : -cutter[0];
    }

    wingThreatLevel(cutter, discTarget) {
      return this.game.offensiveTeam().goalDirection === 'E'
        ? (cutter.position[0] - discTarget[0]) * -cutter.velocity[0]
        : (discTarget[0] - cutter.position[0]) * cutter.velocity[0];
    }

    update() {
      if (this.team.onOffense) {
        return true;
      }

      const discTarget =
        this.game.disc.isLoose()
        ? Disc.simulateUntilCatchable(this.game.disc.position,
          this.game.disc.velocity,
          this.game.disc.upVector)
        .finalPosition
        : this.game.disc.position.slice(0, 2);

      const playerWithDisc = this.game.playerWithDisc();

      const interceptor = this.game.disc.isLoose()
        && getClosestPlayer(this.team.players, discTarget)[0];

      for (let i = 0; i < this.team.players.length; i++) {
        if (this.team.players[i] == interceptor) {
          this.move(interceptor, discTarget);
          continue;
        }

        // Cup
        if (i < 4) {
          const targetPosition = add2d(discTarget, this.cupOffsets[i]);
          this.moveWithin(this.team.players[i], targetPosition, MARK_RADIUS,
            sub2d(discTarget, this.team.players[i].position));
          continue;
        }

        // Wings: cover in-cuts in front of the thrower
        if (i < 6) {
          // Cover in front of the disc
          const xRange = this.game.offensiveTeam().goalDirection === 'E' ? [
              discTarget[0], 110
            ]
            : [0, discTarget[0]];
          // Cover top or bottom side depending on index
          const yRange = i === 4 ? [0, discTarget[1]] : [discTarget[1], 40];
          const myCutters = this.game.defensiveTeam().players.filter(
            p => boundsCheck(p.position, [xRange, yRange])
            && p != playerWithDisc);

          if (myCutters.length === 0) {
            const myTarget = [(xRange[0] + xRange[1]) / 2, (yRange[0] +
              yRange[1]) / 2];
            this.move(this.team.players[i], myTarget);
          } else {
            myCutters.sort((a, b) => this.wingThreatLevel(a, discTarget)
              - this.wingThreatLevel(b, discTarget));
            const myTarget =
              add2d(myCutters[myCutters.length - 1].position, this.offset);
            this.move(this.team.players[i], myTarget);
          }
          continue;
        }

        // Deep: cover the deepest threat
        if (i === 6) {
          const myCutters =
            this.game.offensiveTeam().players.filter(p => p !=
            playerWithDisc);
          myCutters.sort((a, b) =>
            this.deepThreatLevel(a) - this.deepThreatLevel(b));
          const myTarget =
            add2d(myCutters[myCutters.length - 1].position, this.offset);
          this.move(this.team.players[i], myTarget);
        }
      }
    }
  }