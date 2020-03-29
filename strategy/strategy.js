
import { project2d } from '../math_utils.js';
import { FrameBuffer } from '../frame_buffer.js';

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
  // direction indicated by 'faceVector'
  moveWithin(player, destination, within = 0.1, restVector) {
    if (dist2d(player, destination) > within) {
      this.move(player, destination);
    } else {
      player.rest(restVector);
    }
  }

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
      context.lineTo(destinationScreenPosition[0], destinationScreenPosition[1]);
      context.closePath();
      context.stroke();
      context.globalAlpha = 1;
    });
  }

  draw(context) {
    this.frameBuffer.drawScene(context);
    this.frameBuffer.clear();
  }
}
