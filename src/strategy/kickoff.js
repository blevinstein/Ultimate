const {
  getVector,
  mag2d,
  mul2d,
  sub2d
} = require('../math_utils.js');
const {
  MAX_THROW_SPEED
} = require('../player_params.js');
const {
  Strategy
} = require('./strategy.js');

const DELAY_TIME = 1.0;

module.exports.KickoffStrategy = class KickoffStrategy extends Strategy {
  constructor(game, team) {
    super(game, team);
  }

  update() {
    // Delay before kickoff
    if (this.game.stateTime < DELAY_TIME) {
      for (let player of this.team.players) {
        player.rest(getVector(this.team.goalDirection));
      }
      return;
    }

    if (!this.team.hasDisc()) {
      console.log('Cannot pull without the disc!');
      return true;
    }

    const playerWithDisc = this.game.playerWithDisc();
    if (!playerWithDisc) {
      console.log('No player has the disc!!!');
      return true;
    }
    const target = this.team.goalDirection === 'W' ? [10, Math.random()
      * 40
    ] : [90, Math
      .random() * 40
    ];
    const params = playerWithDisc.rangeFinder.getLongestThrowParams(
      sub2d(target, playerWithDisc.position));
    playerWithDisc.throw(params.velocity, params.angleOfAttack,
      params.tiltAngle);
    return true;
  }
}