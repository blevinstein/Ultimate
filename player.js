
import { linearInterpolate, magnitudeAlong, project3d, project2d, getDirection, add2d, mul2d, mag2d, sub2d } from './math_utils.js';

const STEP = [0, 1, 2, 1];
const SUBFRAMES = 10;
const MAX_PLAYER_ACCEL = 0.05;
const MAX_PLAYER_SPEED = 0.5;
const DECEL_STEPS = MAX_PLAYER_SPEED / MAX_PLAYER_ACCEL;
const MIN_MOVEMENT = 0.04;
const HANDLE_HEIGHT = 3;
const ARM_LENGTH = 1;

export class Player {
  constructor(team, initialPosition, initialDirection = 'E') {
    this.team = team;
    this.discSprite = team.game.resources.discSprite;
    this.runningSprites = team.resources.runningSprites;
    this.standingSprites = team.resources.standingSprites;
    this.position = initialPosition;
    this.velocity = [0, 0];
    this.direction = initialDirection;
    this.moving = false;
    this.frame = Math.trunc(Math.random() * 4 * SUBFRAMES);
    this.hasDisc = false;
  }

  draw(frameBuffer) {
    const screenPosition = project2d(this.position);
    const sprite = this.moving
      ? this.runningSprites[this.direction][STEP[Math.trunc(this.frame++ / SUBFRAMES) % 4]]
      : this.standingSprites[this.direction];
    frameBuffer.drawImage(
        sprite,
        screenPosition[0] - sprite.width / 2,
        screenPosition[1] - sprite.height,
        this.position[1]);
    if (this.hasDisc) {
      const discScreenPosition = project3d([this.position[0] + ARM_LENGTH, this.position[1], HANDLE_HEIGHT]);
      frameBuffer.drawImage(
          this.discSprite,
          discScreenPosition[0] - this.discSprite.width / 2,
          discScreenPosition[1] - this.discSprite.height / 2,
          this.position[1] + 0.1);
    }
  }

  update() {
    this.position = add2d(this.position, this.velocity);
  }

  move(vector) {
    if (vector.some(isNaN)) { throw new Error('Invalid move vector: ' + vector); }
    // TODO: Add interactions between players (e.g. must cut around defender, pick call?)
    // TODO: Use max accel instead of max speed

    const desiredVelocity = mag2d(vector) > DECEL_STEPS * MAX_PLAYER_SPEED
        ? mul2d(vector, MAX_PLAYER_SPEED / mag2d(vector))
        : mul2d(vector, 1 / DECEL_STEPS);
    const desiredAcceleration = sub2d(desiredVelocity, this.velocity);

    const currentSpeed = Math.max(0, magnitudeAlong(this.velocity, desiredAcceleration));
    const maxAcceleration = MAX_PLAYER_ACCEL * (1 - currentSpeed / MAX_PLAYER_SPEED);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
        ? desiredAcceleration
        : mul2d(desiredAcceleration, maxAcceleration / mag2d(desiredAcceleration)));
  }

  rest(faceVector) {
    const desiredAcceleration = mul2d(this.velocity, -1);

    const currentSpeed = Math.max(0, magnitudeAlong(this.velocity, desiredAcceleration));
    const maxAcceleration = MAX_PLAYER_ACCEL * (1 - currentSpeed / MAX_PLAYER_SPEED);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
        ? desiredAcceleration
        : mul2d(desiredAcceleration, maxAcceleration / mag2d(desiredAcceleration)));

    if (faceVector && mag2d(this.velocity) <= MIN_MOVEMENT) {
      this.direction = getDirection(faceVector);
    }
  }

  accelerate(impulse) {
    this.velocity = add2d(this.velocity, impulse);

    if (mag2d(this.velocity) > MIN_MOVEMENT) {
      this.moving = true;
      this.direction = getDirection(this.velocity);
    } else {
      this.moving = false
    }
  }

  throw(velocity) {
    // TODO: Max throw velocity
    // TODO: Add noise for high velocity throws
    if (velocity.length < 3) { console.log('Expected a 3d vector, got ' + velocity); return; }
    if (velocity.some(isNaN)) { console.log('Velocity contains NaN: ' + velocity); return; }
    if (!this.hasDisc) { console.log('Attempted to throw without the disc!'); return; }
    this.team.game.disc.setPosition(this.position.concat(HANDLE_HEIGHT)).setVelocity(velocity);
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
