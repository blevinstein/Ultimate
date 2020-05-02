
import {FrameBuffer} from '../frame_buffer.js';
import {FIELD_BOUNDS, Game} from '../game.js';
import {dist2d, getVector, project2d} from '../math_utils.js';

export class Strategy {
  constructor(game, team) {
    this.game = game;
    this.team = team;
    // FrameBuffer for this strategy to show annotations on the field. Depth is
    // usually unused; all annotations will be drawn in front of the field
    // but behind the players and disc.
    this.frameBuffer = new FrameBuffer();
  }

  // Move player to within 'within' of 'destination', then face in the
  // direction indicated by 'restVector'
  moveWithin(player, destination, within = 0.1, restVector) {
    if (dist2d(player.position, destination) > within) {
      this.move(player, destination);
    } else {
      player.rest(restVector);
    }
  }

  // Move player exactly to 'destination'
  move(player, destination) {
    player.moveTo(destination);
    const playerScreenPosition = project2d(player.position);
    const destinationScreenPosition = project2d(destination);
    this.frameBuffer.drawOperation(0, context => {
      context.strokeStyle = player.team.textColor;
      context.lineWidth = 3;
      context.globalAlpha = 0.1;
      context.beginPath();
      context.moveTo(playerScreenPosition[0], playerScreenPosition[1]);
      context.lineTo(destinationScreenPosition[0],
                     destinationScreenPosition[1]);
      context.stroke();
      context.globalAlpha = 1;
    });
  }

  chargeForward(player) {
    const moveTarget = Game.snapToBounds(
        add2d(player.position,
              mul2d(getVector(this.team.goalDirection), 10)),
        FIELD_BOUNDS);
    this.move(player, moveTarget);
  }

  drawPath(path, alpha = 1) {
    const screenPath = path.map(point => project3d(point.position));
    this.frameBuffer.drawOperation(1, context => {
      context.globalAlpha = alpha;
      context.strokeStyle = 'white';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(...screenPath[0]);
      for (let i = 1; i < screenPath.length; i++) {
        context.lineTo(...screenPath[i]);
      }
      context.stroke();
      context.globalAlpha = 1;
    });
  }

  draw(context) {
    this.frameBuffer.drawScene(context);
    this.frameBuffer.clear();
  }
}
