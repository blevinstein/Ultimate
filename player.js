
import {Disc} from './disc.js';
import {
  add2d,
  check2d,
  check3d,
  getDirection,
  getVector,
  linearInterpolate,
  mag2d,
  magnitudeAlong2d,
  mul2d,
  norm2d,
  project2d,
  project3d,
  sub2d
} from './math_utils.js';

const STEP = [ 0, 1, 2, 1 ];
const SUBFRAMES = 10;
const MAX_PLAYER_ACCEL = 0.03;
const MAX_PLAYER_SPEED = 0.4;
const DECEL_STEPS = 2 * MAX_PLAYER_SPEED / MAX_PLAYER_ACCEL;
const MIN_MOVEMENT = 0.04;
const HANDLE_SPEED = 0.4;
const DECEL_DISTANCE = Math.pow(DECEL_STEPS, 2) * MAX_PLAYER_ACCEL / 2;
;

export const ARM_HEIGHT = 2;
export const ARM_LENGTH = 1.5;
export const MAX_THROW_SPEED = 1.8;

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
    this.velocity = [ 0, 0 ];
    this.direction = initialDirection;
    this.moving = false;
    this.frame = Math.trunc(Math.random() * 4 * SUBFRAMES);
    this.hasDisc = false;
  }

  toString() { return 'Player[' + this.id + ']'; }

  draw(frameBuffer) {
    const screenPosition = project2d(this.position);
    const sprite =
        this.moving
            ? this.runningSprites[this.direction][STEP[Math.trunc(this.frame++ /
                                                                  SUBFRAMES) %
                                                       4]]
            : this.standingSprites[this.direction];
    frameBuffer.drawOperation(this.position[1],
                              context => context.drawImage(
                                  sprite, screenPosition[0] - sprite.width / 2,
                                  screenPosition[1] - sprite.height));
  }

  desiredHandlePosition() {
    // TODO: Make variable based on throw (hold to left or right)
    return add3d(
        this.position.concat(ARM_HEIGHT * 2 / 3),
        mul3d(getVector(this.direction).concat(0), ARM_LENGTH * 2 / 3));
  }

  update() {
    if (this.hasDisc) {
      const desiredDiscVelocity =
          sub3d(this.desiredHandlePosition(), this.team.game.disc.position);
      const actualVelocity = mag3d(desiredDiscVelocity) > HANDLE_SPEED
                                 ? mul3d(norm3d(desiredDiscVelocity), HANDLE_SPEED)
                                 : desiredDiscVelocity;
      this.team.game.disc.setVelocity(actualVelocity);
    }
    this.position = add2d(this.position, this.velocity);
  }

  // Move with deceleration to avoid overshoot
  moveTo(target) {
    check2d(target);
    let vector = sub2d(target, this.position);

    if (mag2d(vector) === 0) {
      this.rest();
      return;
    }

    const desiredVelocity = mag2d(vector) > DECEL_DISTANCE
                                ? mul2d(norm2d(vector), MAX_PLAYER_SPEED)
                                : mul2d(norm2d(vector), 2 * mag2d(vector) / DECEL_STEPS + MAX_PLAYER_ACCEL);
    const desiredAcceleration = sub2d(desiredVelocity, this.velocity);

    const currentSpeed =
        Math.max(0, magnitudeAlong2d(this.velocity, desiredAcceleration));
    const maxAcceleration =
        MAX_PLAYER_ACCEL * (1 - currentSpeed / MAX_PLAYER_SPEED);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
                        ? desiredAcceleration
                        : mul2d(desiredAcceleration,
                                maxAcceleration / mag2d(desiredAcceleration)));
  }

  rest(faceVector) {
    const desiredAcceleration = mul2d(this.velocity, -1);

    const currentSpeed =
        Math.max(0, magnitudeAlong2d(this.velocity, desiredAcceleration));
    const maxAcceleration =
        MAX_PLAYER_ACCEL * (1 - currentSpeed / MAX_PLAYER_SPEED);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
                        ? desiredAcceleration
                        : mul2d(desiredAcceleration,
                                maxAcceleration / mag2d(desiredAcceleration)));

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

  // TODO: Add noise for high velocity throws
  throw(velocity, angleOfAttack, tiltAngle) {
    // DEBUG: console.log('Throw: velocity=' + velocity + ' angleOfAttack=' +
    // angleOfAttack + ' tiltAngle=' + tiltAngle);
    check3d(velocity);
    if (mag3d(velocity) > MAX_THROW_SPEED) {
      throw new Error('Cannot throw that fast: ' + mag3d(velocity) + ' (' +
                      velocity + ')');
    }
    if (!this.hasDisc) {
      console.log('Attempted to throw without the disc!');
      return;
    }
    this.team.game.disc.setVelocity(velocity)
        .setUpVector(Disc.createUpVector(velocity, angleOfAttack, tiltAngle))
        .setPlayer(null);
    this.team.game.discThrownBy(this);
  }

  drop() {
    this.team.game.discDroppedBy(this);
    if (!this.hasDisc) {
      console.log('Attempted to drop without the disc!');
      return;
    }
    this.team.game.disc.setPlayer(null);
  }

  setHasDisc(hasDisc) { this.hasDisc = hasDisc; }

  // return time to reach the location
  static simulateRunTime(location, initialVelocity, goalRadius = 1) {
    const player = new Player(null, [ 0, 0 ]);
    player.velocity = initialVelocity;
    let time = 0;
    let target;
    do {
      player.update();
      player.moveTo(location);
      time++;
    } while (dist2d(player.position, location) > goalRadius);
    return time;
  }
}
