
import { linearInterpolate } from './math_utils.js';

const STEP = [0, 1, 2, 1];

// Project from rect 110x40 to trapezoid 410/445x172 offset 25x30
function project(position) {
  let xShrinkFactor = linearInterpolate(415.0/445, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 445.0/110 + 25;
  let yPosition = 30 + position[1] * 172.0/40;
  return [xPosition, yPosition];
}

export class Player {
  constructor(resources, initialPosition, initialDirection = 'E') {
    this.runningSprites = resources.runningSprites;
    this.standingSprites = resources.standingSprites;
    this.position = initialPosition;
    this.direction = initialDirection;
    this.moving = false;
    this.frame = 0;
  }

  draw(context) {
    const screenPosition = project(this.position);
    const sprite = this.moving
      ? this.runningSprites[this.direction][STEP[this.frame++ % 4]]
      : this.standingSprites[this.direction];
    context.drawImage(
        sprite,
        screenPosition[0] - sprite.width / 2,
        screenPosition[1] - sprite.height);
  }
}
