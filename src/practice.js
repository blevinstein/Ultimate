
import {Disc} from './disc.js';
import {drawPath} from './draw_utils.js';
import {FrameBuffer} from './frame_buffer.js';
import {BG, EYES, Game, HAIR, PANTS, SHIRT, SKIN, SOCKS} from './game.js';
import {zRotate3d} from './math_utils.js';
import {ARM_HEIGHT} from './player.js';
import {Team} from './team.js';
import {ToastService} from './toast_service.js';

const THROW_EVERY_N_STEPS = 15;

const GREEN_COLORS = [
  [ BG ],
  [ EYES ],
  [ SKIN ],
  [ SHIRT, [ 0, 255, 0, 255 ] ],
  [ PANTS, [ 0, 200, 0, 255 ] ],
  [ SOCKS ],
  [ HAIR ],
];

export class Practice extends Game {
  constructor(resources, canvas) {
    super(resources, canvas);
    this.reset();
  }

  reset() {
    this.teams = [
      new Team(this, /*coach=*/ null, '#00ff00', GREEN_COLORS, 'E')
          .addPlayer([ 20, 20 ], 'E'),
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
    // this.allPaths = [];
    // for (let sample of this.rangeFinder.samples) {
    //  let throwParams = sample.input;
    //  this.allPaths.push(
    //      Disc.simulateUntilGrounded(this.thrower.position.concat(ARM_HEIGHT),
    //                                 throwParams.velocity,
    //                                 Disc.createUpVector(throwParams), true)
    //          .path);
    //}
  }

  createDisc() {
    this.disc = new Disc(this)
                    .setPlayer(this.thrower)
                    .setVelocity([ 0, 0, 0 ])
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

    // TODO: Draw all possible throws
    // for (let path of this.allPaths) {
    //  drawPath(frameBuffer, path, 0.2, 'white');
    //}

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
    frameBuffer.drawScene(context);
  }

  update() {
    if (++this.step % THROW_EVERY_N_STEPS === 0 &&
        this.throwCount < this.rangeFinder.samples.length) {
      const sprinklerAngle =
          0.5 * Math.sin(++this.throwCount * 2 * Math.PI / 30);
      const throwParams =
          this.rangeFinder
              .samples[this.rangeFinder.samples.length - this.throwCount]
              .input;
      this.thrower.throw(zRotate3d(throwParams.velocity, sprinklerAngle),
                         throwParams.angleOfAttack, throwParams.tiltAngle);
    }
    // Players and physics update
    for (let team of this.teams) {
      for (let player of team.players) {
        player.update();
      }
    }
    for (let i = 0; i < this.discs.length; ++i) {
      if (!this.discs[i].grounded) {
        this.discs[i].update();
      }
    }
    this.toastService.update();
  }

  discThrownBy(player) { this.createDisc(); }

  discCaughtBy(player) {}

  discGrounded() {}

  setState(state) {}
}