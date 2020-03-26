
import { linearInterpolate, magnitudeAlong2d, project3d, project2d, getDirection, getVector, add2d, check2d, check3d, mul2d, mag2d, sub2d } from './math_utils.js';
import { Disc } from './disc.js';

const STEP = [0, 1, 2, 1];
const SUBFRAMES = 10;
const MAX_PLAYER_ACCEL = 0.03;
const MAX_PLAYER_SPEED = 0.3;
const DECEL_STEPS = MAX_PLAYER_SPEED / MAX_PLAYER_ACCEL;
const MIN_MOVEMENT = 0.04;
const HANDLE_HEIGHT = 3;
const ARM_LENGTH = 1;

export class Player {
  constructor(team, initialPosition, initialDirection = 'E') {
    Player.maxId = Player.maxId || 0;
    this.id = Player.maxId++;

    this.team = team;
    if (team && team.game && team.game.resources) {
      this.discSprite = team.game.resources.discSprite;
      this.runningSprites = team.resources.runningSprites;
      this.standingSprites = team.resources.standingSprites;
    }
    this.position = initialPosition;
    this.velocity = [0, 0];
    this.direction = initialDirection;
    this.moving = false;
    this.frame = Math.trunc(Math.random() * 4 * SUBFRAMES);
    this.hasDisc = false;
  }

  toString() {
    return 'Player[' + this.id + ']';
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
      const discScreenPosition = project3d(add2d(this.position, mul2d(getVector(this.direction), ARM_LENGTH)).concat(HANDLE_HEIGHT));
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
    check2d(vector);
    // TODO: Add interactions between players (e.g. must cut around defender, pick call?)
    // TODO: Use max accel instead of max speed

    const desiredVelocity = mag2d(vector) > DECEL_STEPS * MAX_PLAYER_SPEED
        ? mul2d(vector, MAX_PLAYER_SPEED / mag2d(vector))
        : mul2d(vector, 1 / DECEL_STEPS);
    const desiredAcceleration = sub2d(desiredVelocity, this.velocity);

    const currentSpeed = Math.max(0, magnitudeAlong2d(this.velocity, desiredAcceleration));
    const maxAcceleration = MAX_PLAYER_ACCEL * (1 - currentSpeed / MAX_PLAYER_SPEED);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
        ? desiredAcceleration
        : mul2d(desiredAcceleration, maxAcceleration / mag2d(desiredAcceleration)));
  }

  rest(faceVector) {
    const desiredAcceleration = mul2d(this.velocity, -1);

    const currentSpeed = Math.max(0, magnitudeAlong2d(this.velocity, desiredAcceleration));
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

  throw(velocity, angleOfAttack) {
    // TODO: Max throw velocity
    // TODO: Add noise for high velocity throws
    check3d(velocity);
    let discPosition = this.position.concat(HANDLE_HEIGHT);
    console.log('Throw with params discPosition=' + discPosition + ' velocity=' + velocity + ' angleOfAttack=' + angleOfAttack);
    if (!this.hasDisc) { console.log('Attempted to throw without the disc!'); return; }
    this.team.game.disc
        .setPosition(discPosition)
        .setVelocity(velocity)
        .setUpVector(Disc.createUpVector(velocity, angleOfAttack));
    this.team.game.discThrownBy(this);
  }

  drop() {
    if (!this.hasDisc) { console.log('Attempted to drop without the disc!'); return; }
    console.log('Player dropped disc');
    this.team.game.disc
        .setPosition(this.position.concat(0))
        .setVelocity([0, 0, 0])
        .setUpVector([0, 0, 1]);
  }

  setHasDisc(hasDisc) {
    this.hasDisc = hasDisc;
  }

  // return time to reach the location
  static simulateRunTime(location, initialVelocity, goalRadius = 1) {
    const player = new Player(null, [0, 0]);
    let time = 0;
    let target;
    do {
      target = sub2d(location, player.position);
      player.update();
      player.move(target);
      time++;
    } while (mag2d(target) > goalRadius);
    return time;
  }
}
