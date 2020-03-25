
import { linearInterpolate } from './math_utils.js';

const STEP = [0, 1, 2, 1];
const SUBFRAMES = 10;
const PLAYER_HEIGHT = 2;
const PLAYER_SPEED = 0.5;
const MIN_MOVEMENT = 1;

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
    this.frame = Math.trunc(Math.random() * 4 * SUBFRAMES);
    this.hasDisc = false;
  }

  draw(context) {
    const screenPosition = project(this.position);
    const sprite = this.moving
      ? this.runningSprites[this.direction][STEP[Math.trunc(this.frame++ / SUBFRAMES) % 4]]
      : this.standingSprites[this.direction];
    context.drawImage(
        sprite,
        screenPosition[0] - sprite.width / 2,
        screenPosition[1] - sprite.height);
  }

  move(amount) {
    // TODO: Add interactions between players (e.g. must cut around defender, pick call?)
    // TODO: Use max accel instead of max speed
    const magnitude = Math.sqrt(Math.pow(amount[0], 2) + Math.pow(amount[1], 2));
    const multiplier = magnitude > PLAYER_SPEED ? PLAYER_SPEED / magnitude : 1;
    for (let i of [0, 1]) {
      this.position[i] += amount[i] * multiplier;
    }
    this.moving = Math.sqrt(Math.pow(amount[0], 2) + Math.pow(amount[1], 2)) > MIN_MOVEMENT;
  }

  rest() {
    this.moving = false;
  }

  throw(velocity) {
    // TODO: Max throw velocity
    // TODO: Add noise for high velocity throws
    if (velocity.length < 3) { console.log('Expected a 3d vector, got ' + velocity); return; }
    if (velocity.some(isNaN)) { console.log('Velocity contains NaN: ' + velocity); return; }
    if (!this.hasDisc) { console.log('Attempted to throw without the disc!'); return; }
    this.team.game.disc.setPosition(this.position.concat(PLAYER_HEIGHT)).setVelocity(velocity);
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
