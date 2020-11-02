const {
  Disc
} = require('./disc.js');
const {
  drawPath
} = require('./draw_utils.js');
const {
  FrameBuffer
} = require('./frame_buffer.js');
const {
  BG,
  EYES,
  Game,
  HAIR,
  PANTS,
  SHIRT,
  SKIN,
  SOCKS
} = require('./game.js');
const {
  zRotate3d
} = require('./math_utils.js');
const {
  ARM_HEIGHT
} = require('./player_params.js');
const {
  Team
} = require('./team.js');
const {
  ToastService
} = require('./toast_service.js');

const MAX_DISCS = 1000;
const MAX_THROW_PATHS = 100;
const THROW_EVERY_N_STEPS = 8;

const GREEN_COLORS = [
  [BG],
  [EYES],
  [SKIN],
  [SHIRT, [0, 255, 0, 255]],
  [PANTS, [0, 200, 0, 255]],
  [SOCKS],
  [HAIR],
];

/**
 * Simple Game with competitive elements (e.g. scoring) stripped out. Useful as
 * a practice venue.
 */
class Practice extends Game {
  constructor(resources, canvas) {
    super(resources, canvas);
    this.reset();
  }

  reset() {
    this.teams = [
      new Team(this, /*coach=*/ null, '#00ff00', GREEN_COLORS, 'E')
      .addPlayer([20, 20], 'E'),
      new Team(this, /*coach=*/ null, '#000000', [], 'W')
    ];
    this.teams[0].setOnOffense(true);
    this.thrower = this.teams[0].players[0];
    this.lastThrower = this.thrower;
    this.rangeFinder = this.thrower.rangeFinder;
    this.discs = [];
    this.createDisc();
    this.toastService = new ToastService();
    this.throwCount = 0;
    this.step = 0;
    this.throwPaths = [];
  }

  createDisc() {
    this.disc = new Disc(this)
      .setPlayer(this.thrower)
      .setVelocity([0, 0, 0])
      .setPosition(this.thrower.position.concat(ARM_HEIGHT));
    this.discs.push(this.disc);
  }

  draw(context) {
    const frameBuffer = new FrameBuffer();
    for (let team of this.teams) {
      team.draw(frameBuffer);
    }
    for (let disc of this.discs) {
      disc.draw(frameBuffer);
    }
    this.toastService.draw(frameBuffer);

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#50a003';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    context.drawImage(this.resources.fieldSprite, 0, 0);
    for (let team of this.teams) {
      if (team.strategy) {
        team.strategy.draw(context);
      }
    }

    // PRACTICE: Draw all throw paths.
    for (let i = 0; i < this.throwPaths.length; i++) {
      drawPath(frameBuffer, this.throwPaths[i],
        Math.pow(0.9, this.throwPaths.length - i));
    }

    frameBuffer.drawScene(context);
  }

  update() {
    // PRACTICE: Throw every throw in RangeFinder samples.
    if (++this.step % THROW_EVERY_N_STEPS === 0
      && this.throwCount < this.rangeFinder.samples.length) {
      const sprinklerAngle = 0.3 * Math.sin(this.throwCount * 2 * 3.1 / 30);
      this.rangeFinder.samples.sort((a, b) => b.uncatchable.position[0] - a.uncatchable.position[0]);
      const throwParams = this.rangeFinder.samples[this.throwCount].input;
      const throwVelocity = zRotate3d(throwParams.velocity, sprinklerAngle);
      this.throwPaths.push(Disc.simulateUntilGrounded(
          this.disc.position,
          throwVelocity,
          Disc.createUpVector({
            velocity: throwVelocity,
            angleOfAttack: throwParams.angleOfAttack,
            tiltAngle: throwParams.tiltAngle
          }), true).path);
      if (this.throwPaths.length > MAX_THROW_PATHS) {
        this.throwPaths = this.throwPaths.slice(1);
      }
      this.thrower.throwDisc(throwVelocity,
        throwParams.angleOfAttack, throwParams.tiltAngle);
      this.throwCount++;
    }

    // Players and physics update
    for (let team of this.teams) {
      for (let player of team.players) {
        player.update();
      }
    }
    for (let disc of this.discs) {
      if (!disc.grounded) {
        disc.update();
      }
    }
    if (this.discs.length > MAX_DISCS) {
      this.discs.splice(0, 1);
    }
    this.toastService.update();
  }

  discThrownBy(player) {
    this.createDisc();
  }

  discCaughtBy(player) {}

  discGrounded() {}

  setState(state) {}
}

module.exports.Practice = Practice;
