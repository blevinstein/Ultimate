
const STEP = [0, 1, 2, 1];

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
    // TODO: transform position
    const sprite = this.moving
      ? this.runningSprites[this.direction][STEP[this.frame++ % 4]]
      : this.standingSprites[this.direction];
    context.drawImage(sprite, this.position[0] - sprite.width, this.position[1] - sprite.height);
  }
}
