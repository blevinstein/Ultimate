
import {Disc} from './disc.js';
import {FrameBuffer} from './frame_buffer.js';
import {BG, EYES, Game, HAIR, PANTS, SHIRT, SKIN, SOCKS} from './game.js';
import {ARM_HEIGHT} from './player.js';
import {Team} from './team.js';
import {ToastService} from './toast_service.js';

// Milliseconds to wait between frames at normal speed
const FRAME_TIME_MS = 30;

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
  constructor(resources, canvas) { super(resources, canvas); }

  reset() {
    this.teams = [
      new Team(this, /*coach=*/ null, '#00ff00', GREEN_COLORS, 'E')
          .addPlayer([ 20, 20 ], 'E'),
      new Team(this, /*coach=*/ null, '#000000', [], 'W')
    ];
    this.teams[0].setOnOffense(true);
    this.thrower = this.teams[0].players[0];
    this.discs = [];
    this.createDisc();
    this.toastService = new ToastService();
  }

  createDisc() {
    this.disc = new Disc(this)
                    .setPlayer(this.thrower)
                    .setVelocity([ 0, 0, 0 ])
                    .setPosition(this.thrower.position.concat(ARM_HEIGHT));
    this.discs.push(this.disc);
  }

  start() {
    this.tickCallback = window.setTimeout(this.tick.bind(this), FRAME_TIME_MS);
    this.reset();
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
    // Players and physics update
    for (let team of this.teams) {
      for (let player of team.players) {
        player.update();
      }
    }
    for (let disc of this.discs) {
      disc.update();
    }
    this.toastService.update();
  }

  discThrownBy(player) { this.createDisc(); }
}
