
import { linearInterpolate } from './math_utils.js';

const STEP = [0, 1, 2, 1];
const SUBFRAMES = 10;

// Project from rect 110x40 to trapezoid 410/445x172 offset 25x30
function project(position) {
  let xShrinkFactor = linearInterpolate(415.0/445, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 445.0/110 + 25;
  let yPosition = 30 + position[1] * 172.0/40;
  return [xPosition, yPosition];
}

export class Player {
  constructor(team, initialPosition, initialDirection = 'E') {
    this.team = team;
    this.runningSprites = team.resources.runningSprites;
    this.standingSprites = team.resources.standingSprites;
    this.position = initialPosition;
    this.direction = initialDirection;
    this.moving = false;
    this.frame = 0;
    this.hasDisc = false;
  }

  draw(context) {
    const screenPosition = project(this.position);
    const sprite = this.moving
      ? this.runningSprites[this.direction][STEP[Math.trunc(this.frame++ / SUB_FRAMES) % 4]]
      : this.standingSprites[this.direction];
    context.drawImage(
        sprite,
        screenPosition[0] - sprite.width / 2,
        screenPosition[1] - sprite.height);
  }

  move(amount) {
    for (let i = 0; i < 2; i++) {
      this.position[i] += amount[i];
    }
    this.moving = true;
  }

  rest() {
    this.moving = false;
  }

  throw(velocity) {
    if (!this.hasDisc) { console.log('Attempted to throw without the disc!'); return; }
    this.team.game.disc.setPosition(this.position.concat(2)).setVelocity(velocity);
    this.team.game.discThrownBy(this);
  }

  drop() {
    if (!this.hasDisc) { console.log('Attempted to drop without the disc!'); return; }
    this.team.game.disc.setPosition(this.position).setVelocity([0, 0, 0]);
  }

  setHasDisc(hasDisc) {
    this.hasDisc = hasDisc;
  }
}
