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
const {
  NUM_PLAYERS
} = require('../team.js');
const {
  ARM_HEIGHT
} = require('../player_params.js');

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
      // HACK: Fix the problem by transporting the disc to a random player.
      const randomPlayer =
        this.team.players[Math.trunc(Math.random() * NUM_PLAYERS)];
      this.game.disc
        .setPlayer(randomPlayer)
        .setVelocity([0, 0, 0])
        .setPosition(randomPlayer.position.concat(ARM_HEIGHT));
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
    playerWithDisc.throwDisc(params.velocity, params.angleOfAttack,
      params.tiltAngle);
    return true;
  }
}