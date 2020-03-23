
import { linearInterpolate } from './math_utils.js';

const GROUND_FRICTION = 0.9;
const AIR_FRICTION = 0.99;

// Project from cuboid 110x40xInf to trapezoid 410/455x172 offset 25x30
function project(position) {
  let xShrinkFactor = linearInterpolate(415.0/445, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 445.0/110 + 25;
  let yPosition = 30 + (position[1] + position[2]*0.5) * 172.0/40;
  return [xPosition, yPosition];
}

export class Disc {
  constructor(game, initialPlayer, initialPosition) {
    this.game = game;
    this.sprite = game.resources.discSprite;
    if (initialPlayer) {
      setPlayer(initialPlayer);
    } else if (initialPosition) {
      this.setPosition(initialPosition);
    } else {
      this.setPosition([55, 20, 0]);
    }
  }

  setPosition(position) {
    if (this.player) { this.player.setHasDisc(false); }
    this.position = position;
    this.player = null;
    this.grounded = this.position[2] <= 0;
    return this;
  }

  setPlayer(player) {
    if (this.player) { this.player.setHasDisc(false); }
    this.player = player;
    this.player.setHasDisc(true);
    this.position = null;
    this.grounded = false;
    return this;
  }

  setVelocity(velocity) {
    this.velocity = velocity;
    return this;
  }

  draw(context) {
    if (this.position) {
      const screenPosition = project(this.position);
      context.drawImage(
          this.sprite,
          screenPosition[0] - this.sprite.width / 2,
          screenPosition[1] - this.sprite.height / 2);
    }
    // TODO: Draw near player? Highlight player?
  }

  update() {
    const wasGrounded = this.grounded;

    if (this.position && this.velocity) {
      // Momentum
      for (let i of [0, 1, 2]) {
        this.position[i] += this.velocity[i];
      }

      // Gravity
      this.velocity[2] -= 9.8 / 5;

      // Ground contact
      if (this.position[2] <= 0) {
        this.position[2] = 0;
        this.velocity[2] = 0;
        this.grounded = true;
        for (let i of [0, 1]) { this.velocity[i] *= GROUND_FRICTION; }
      } else {
        // TODO: Add lift
        for (let i of [0, 1, 2]) { this.velocity[i] *= AIR_FRICTION; }
      }

      // Notify on grounded
      if (this.grounded && !wasGrounded) {
        this.game.discGrounded();
      }
    }
  }
}
