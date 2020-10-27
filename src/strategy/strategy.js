const {
  FrameBuffer
} = require('../frame_buffer.js');
const {
  STATES,
  FIELD_BOUNDS
} = require('../game_params.js');
const {
  snapToBounds
} = require('../game_utils.js');
const {
  check2d,
  getVector,
  add2d,
  dist2d,
  mul2d,
  sub2d,
  project2d,
  project3d
} =
require('../math_utils.js');

module.exports.Strategy = class Strategy {
  constructor(game, team) {
    this.game = game;
    this.team = team;
    // FrameBuffer for this strategy to show annotations on the field. Depth is
    // usually unused; all annotations will be drawn in front of the field
    // but behind the players and disc.
    this.frameBuffer = new FrameBuffer();
    // TODO: Refactor onMove/onThrow out of Strategy
    this.onMove = null;
    this.onThrow = null;
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

  throwDisc(player, params) {
    if (!player.hasDisc) {
      throw new Error('Throwing without disc');
    }
    if (this.onThrow) {
      this.onThrow(player, params);
    }
    player.throwDisc(...params);
  }

  // Move player exactly to 'destination'
  move(player, destination) {
    check2d(destination, 'at Strategy.move');
    if (player.hasDisc && this.game.state === STATES.Normal) {
      throw new Error('Moving with disc');
    }
    if (this.onMove) {
      this.onMove(player, sub2d(destination, player.position));
    }
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
    const moveTarget = snapToBounds(
      add2d(player.position, mul2d(getVector(this.team.goalDirection),
        10)),
      FIELD_BOUNDS);
    this.move(player, moveTarget);
  }

  draw(context) {
    this.frameBuffer.drawScene(context);
    this.frameBuffer.clear();
  }

  toString() {
    return this.constructor.name;
  }
};
