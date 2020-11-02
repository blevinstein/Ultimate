const {
  Disc
} = require('./disc.js');
const {
  add2d,
  add3d,
  check2d,
  check3d,
  dist2d,
  dist3d,
  getDirection,
  getVector,
  linearInterpolate,
  mag2d,
  mag3d,
  magnitudeAlong2d,
  mul2d,
  mul3d,
  norm2d,
  project2d,
  project3d,
  sub2d,
  sub3d,
  norm3d,
} = require('./math_utils.js');
const {
  RangeFinderFactory
} = require('./range_finder.js');
const {
  ARM_HEIGHT,
  ARM_LENGTH,
  MAX_THROW_SPEED
} =
require('./player_params.js');

// We show 3 different sprites every 4 frames to create reciprocal movement
const ANIMATION_FRAMES = 4;
const ANIMATION_STEP = [0, 1, 2, 1];
const ANIMATION_SPEED = 0.5;
// Minimum movement speed which should use the 'moving' sprites
const MIN_MOVEMENT = 0.1;

// Maximum speed a player can move the disc
const MAX_HANDLE_SPEED = 0.4;
// Maximum speed a player can accelerate themselves from a stationary start
const MAX_PLAYER_ACCEL = 0.015;
// Maximum speed a player can sprint
const MAX_PLAYER_SPEED = 0.2;
// Player cannot throw if held disc is farther than this from
// desiredHandlePosition()
const MAX_HANDLE_OFFSET = 0.1;

// NB: These are *approximate* values, based on a constant acceleration model
//   A = MAX_PLAYER_ACCEL / 2
//   V = MAX_PLAYER_SPEED
//   X = DECEL_DISTANCE = AT^2 / 2
//   T = DECEL_STEPS = V / A
const DECEL_STEPS = 2 * MAX_PLAYER_SPEED / MAX_PLAYER_ACCEL;
const DECEL_DISTANCE = Math.pow(DECEL_STEPS, 2) * MAX_PLAYER_ACCEL / 2;

module.exports.Player = class Player {
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
    this.frame = Math.random() * ANIMATION_FRAMES;
    this.hasDisc = false;
    this.rangeFinder = RangeFinderFactory.create();
  }

  toString() {
    return 'Player[' + this.id + ']';
  }

  draw(frameBuffer) {
    const screenPosition = project2d(this.position);
    const sprite =
      this.moving
      ? this.runningSprites[this.direction]
      [ANIMATION_STEP[Math.trunc(this.frame)
        % ANIMATION_FRAMES]]
      : this.standingSprites[this.direction];
    if (this.moving) {
      this.frame += mag2d(this.velocity) * ANIMATION_SPEED;
    }
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

  canThrow() {
    return this.hasDisc
      && dist3d(this.team.game.disc.position, this.desiredHandlePosition())
      <= MAX_HANDLE_OFFSET;
  }

  update() {
    if (this.hasDisc) {
      // Player moves the disc relative to their body.
      const desiredDiscVelocity =
        sub3d(this.desiredHandlePosition(), this.team.game.disc.position);
      // Disc moves along with player as they move.
      this.team.game.disc.position =
        add3d(this.team.game.disc.position, this.velocity.concat(0));
      // Player cannot move the disc faster than MAX_HANDLE_SPEED
      const actualVelocity =
        mag3d(desiredDiscVelocity) > MAX_HANDLE_SPEED
        ? mul3d(norm3d(desiredDiscVelocity), MAX_HANDLE_SPEED)
        : desiredDiscVelocity;
      this.team.game.disc.setVelocity(actualVelocity);
    }
    this.position = add2d(this.position, this.velocity);
  }

  // Returns a scalar indicating the maximum amount of acceleration that is
  // allowed in a particular direction.
  maxAllowedAcceleration(direction) {
    // Calculate the player's current speed in the direction indicated.
    const currentSpeed =
      Math.max(0, magnitudeAlong2d(this.velocity, direction));
    // Simple linear model, such that:
    // * At currentSpeed = 0, maxAllowedAcceleration = MAX_PLAYER_ACCEL
    // * At currentSpeed = MAX_PLAYER_SPEED, maxAllowedAcceleration = 0
    // * NB: if currentSpeed < 0, maxAllowedAcceleration > MAX_PLAYER_ACCEL
    return MAX_PLAYER_ACCEL * (1 - currentSpeed / MAX_PLAYER_SPEED);
  }

  // Move with deceleration to avoid overshoot
  moveTo(target) {
    check2d(target, 'at moveTo');
    let vector = sub2d(target, this.position);

    if (mag2d(vector) === 0) {
      this.rest();
      return;
    }

    // Attempt to decelerate smoothly as we approach our destination.
    const desiredVelocity =
      mag2d(vector) > DECEL_DISTANCE
      ? mul2d(norm2d(vector), MAX_PLAYER_SPEED)
      // We approximate using our constant acceleration model with
      // A = MAX_PLAYER_ACCEL / 2
      // x = distance from destination a.k.a. mag2d(vector)
      // t = time from destination
      // v = ideal velocity
      // Solve for v in terms of x
      // x = At^2 / 2
      //   -> t = sqrt(2x / A)
      // v = At
      //   -> v = 2A sqrt(2x / A) = 2 sqrt(2xA)
      : mul2d(norm2d(vector),
        2 * Math.sqrt(mag2d(vector) * MAX_PLAYER_ACCEL));
    const desiredAcceleration = sub2d(desiredVelocity, this.velocity);
    const maxAcceleration = this.maxAllowedAcceleration(
      desiredAcceleration);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
      ? desiredAcceleration
      : mul2d(desiredAcceleration,
        maxAcceleration / mag2d(desiredAcceleration)));
    this.direction = getDirection(this.velocity);
  }

  // Move without deceleration
  moveThrough(target) {
    check2d(target, 'at moveThrough');
    let vector = sub2d(target, this.position);

    if (mag2d(vector) === 0) {
      this.rest();
      return;
    }

    const desiredVelocity = mul2d(norm2d(vector), MAX_PLAYER_SPEED);
    const desiredAcceleration = sub2d(desiredVelocity, this.velocity);
    const maxAcceleration = this.maxAllowedAcceleration(
      desiredAcceleration);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
      ? desiredAcceleration
      : mul2d(desiredAcceleration,
        maxAcceleration / mag2d(desiredAcceleration)));
    this.direction = getDirection(this.velocity);
  }

  rest(faceVector) {
    const desiredAcceleration = mul2d(this.velocity, -1);
    const maxAcceleration = this.maxAllowedAcceleration(
      desiredAcceleration);

    this.accelerate(mag2d(desiredAcceleration) <= maxAcceleration
      ? desiredAcceleration
      : mul2d(desiredAcceleration,
        maxAcceleration / mag2d(desiredAcceleration)));

    if (faceVector) {
      this.direction = getDirection(faceVector);
    } else {
      this.direction = getDirection(this.velocity);
    }
  }

  accelerate(impulse) {
    this.velocity = add2d(this.velocity, impulse);

    if (mag2d(this.velocity) > MIN_MOVEMENT) {
      this.moving = true;
    } else {
      this.moving = false
    }
  }

  // TODO: Add noise for high velocity throws
  // TODO: Throw farther when !moving or moving in direction of throw?
  throwDisc(velocity, angleOfAttack, tiltAngle) {
    // DEBUG: console.log('Throw: velocity=' + velocity + ' angleOfAttack=' +
    // angleOfAttack + ' tiltAngle=' + tiltAngle);
    check3d(velocity);
    if (mag3d(velocity) > MAX_THROW_SPEED) {
      // DEBUG: console.log(
      //  `Tried to throw too fast: ${mag3d(velocity)} > ${MAX_THROW_SPEED}`);
      velocity = mul3d(norm3d(velocity), MAX_THROW_SPEED);
    }
    if (!this.hasDisc) {
      console.log('Attempted to throw without the disc!');
      return;
    }
    this.team.game.disc.setVelocity(velocity)
      .setUpVector(Disc.createUpVector({
        velocity,
        angleOfAttack,
        tiltAngle
      }))
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

  setHasDisc(hasDisc) {
    this.hasDisc = hasDisc;
  }

  // Return time (in simulation steps) to reach the location
  static simulateRunTime(location, initialVelocity, goalRadius = 1) {
    const player = new Player(null, [0, 0]);
    player.velocity = initialVelocity;
    let time = 0;
    let target;
    do {
      player.update();
      player.moveThrough(location);
      time++;
    } while (dist2d(player.position, location) > goalRadius);
    return time;
  }
}
