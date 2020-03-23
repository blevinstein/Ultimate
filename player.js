
const fieldSize = [496, 184];
const STEP = [0, 1, 2, 1];

function linearInterpolate(from, to, amount) {
  return from + (to - from) * amount;
}

function project(position) {
  let xShrinkFactor = linearInterpolate(415.0/445, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 445.0/110 + 25;
  let yPosition = 9 + position[1] * 173.0/40;
  return [xPosition, yPosition];
}

export class Player {
  constructor(runningSprites, standingSprites, initialPosition, initialDirection = 'E') {
    this.runningSprites = runningSprites;
    this.standingSprites = standingSprites;
    this.position = initialPosition;
    this.direction = initialDirection;
    this.moving = true;
    this.frame = 0;
  }

  draw(context) {
    const screenPosition = project(this.position);
    const sprite = this.moving
      ? this.runningSprites[this.direction][STEP[this.frame++ % 4]]
      : this.standingSprites[this.direction];
    context.drawImage(sprite, screenPosition[0] - sprite.width / 2, screenPosition[1] - sprite.height);
  }
}
