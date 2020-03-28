
import { add2d, getVector, mul2d, sub2d, sub3d } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game } from '../game.js';
import { Strategy } from './strategy.js';
import { ARM_HEIGHT } from '../player.js';

const MARK_RADIUS = 0.5;

export class ZoneDefenseStrategy extends Strategy {
  constructor(game, team) {
    super(game, team);
    this.forceDirection = Math.random() < 0.5 ? getVector('N') : getVector('S');
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
    return this.game.offensiveTeam().goalDirection === 'E' ? cutter[0] : -cutter[0];
  }

  wingThreatLevel(cutter, discTarget) {
    return this.game.offensiveTeam().goalDirection === 'E'
        ? (cutter.position[0] - discTarget[0]) * -cutter.velocity[0]
        : (discTarget[0] - cutter.position[0]) * cutter.velocity[0];
  }

  update() {
    if (this.team.onOffense) { return true; }

    const discTarget = this.game.disc.isLoose()
        ? Disc.simulateUntilGrounded(
              sub3d(this.game.disc.position, [0, 0, ARM_HEIGHT]),
              this.game.disc.velocity,
              this.game.disc.upVector)[0]
        : this.game.disc.position.slice(0, 2);

    const playerWithDisc = this.game.playerWithDisc();

    const interceptor = this.game.disc.isLoose()
        && Game.getClosestPlayer(this.team.players, discTarget)[0];

    for (let i = 0; i < this.team.players.length; i++) {
      if (this.team.players[i] == interceptor) {
        interceptor.move(sub2d(discTarget, interceptor.position));
        continue;
      }

      // Cup
      if (i < 4) {
        const targetPosition = add2d(discTarget, this.cupOffsets[i]);
        if (dist2d(targetPosition, this.team.players[i].position) > MARK_RADIUS) {
          this.team.players[i].move(sub2d(targetPosition, this.team.players[i].position));
        } else {
          this.team.players[i].rest(sub2d(discTarget, this.team.players[i].position));
        }
        continue;
      }

      // Wings: cover in-cuts in front of the thrower
      if (i < 6) {
        // Cover in front of the disc
        const xRange = this.game.offensiveTeam().goalDirection === 'E'
            ? [discTarget[0], 110] : [0, discTarget[0]];
        // Cover top or bottom side depending on index
        const yRange = i === 4 ? [0, discTarget[1]] : [discTarget[1], 40];
        const myCutters = this.game.defensiveTeam().players
            .filter(p => Game.boundsCheck(p.position, [xRange, yRange]) && p != playerWithDisc);

        if (myCutters.length === 0) {
          const myTarget = [(xRange[0] + xRange[1]) / 2, (yRange[0] + yRange[1]) / 2];
          //this.team.players[i].move(sub2d(myTarget, this.team.players[i].position));
          this.team.players[i].rest();
        } else {
          myCutters.sort((a, b) => this.wingThreatLevel(a, discTarget) - this.wingThreatLevel(b, discTarget));
          const myTarget = add2d(myCutters[myCutters.length - 1].position, this.offset);
          this.team.players[i].move(sub2d(myTarget, this.team.players[i].position));
        }
        continue;
      }

      // Deep: cover the deepest threat
      if (i === 6) {
        const myCutters = this.game.offensiveTeam().players.filter(p => p != playerWithDisc);
        myCutters.sort((a, b) => this.deepThreatLevel(a) - this.deepThreatLevel(b));
        const myTarget = add2d(myCutters[myCutters.length - 1].position, this.offset);
        this.team.players[i].move(sub2d(myTarget, this.team.players[i].position));
      }
    }
  }
}
