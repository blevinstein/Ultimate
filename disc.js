
import { add3d, check1d, check3d, cross3d, dist2d, dist3d, dot3d, mag3d, mul3d, norm3d, sub3d, linearInterpolate, magnitudeAlong3d, project2d, project3d } from './math_utils.js';
import { Game, STATES, FIELD_BOUNDS_NO_ENDZONES } from './game.js';
import { ARM_HEIGHT, ARM_LENGTH } from './player.js';

const GROUND_FRICTION = 0.2;
const GRAVITY = 0.05;

const OPTIMAL_DRAG_ANGLE = -0.08;
const DRAG_CONST = 0.001;
const DRAG_QUADRATIC = 0.25;

const LIFT_CONST = 0.002;
const LIFT_LINEAR = 0.02;

const MAX_PICKUP_DIST = 1;

const DISC_SIZE = 3;

export class Disc {
  constructor(game) {
    this.game = game;
    this.velocity = [0, 0, 0];
    this.upVector = [0, 0, 1];
    this.position = [55, 20, 0];
    this.player = null;
  }

  setPosition(position) {
    this.position = check3d(position);
    this.grounded = this.position[2] <= 0;
    return this;
  }

  setPlayer(player) {
    if (this.player) { this.player.setHasDisc(false); }
    this.player = player;
    if (this.player) {
      this.player.setHasDisc(true);
      this.upVector = [0, 0, 1];
      this.grounded = false;
    }
    return this;
  }

  setVelocity(velocity) {
    this.velocity = check3d(velocity);
    return this;
  }

  setUpVector(upVector) {
    check3d(upVector);
    this.upVector = mul3d(upVector, 1 / mag3d(upVector));
    return this;
  }

  isLoose() {
    return !this.player;
  }

  accelerate(acceleration) {
    this.velocity = add3d(this.velocity, check3d(acceleration));
  }

  draw(frameBuffer) {
    const screenPosition = project3d(this.position);
    let screenMajorAxis;
    let screenMinorAxis;
    const intoScreenUnit = norm3d([0, -1, -1]);
    if (mag3d(cross3d(this.upVector, intoScreenUnit)) > 0) {
      const alongScreenUnit = norm3d(cross3d(this.upVector, intoScreenUnit));
      const minorDiscAxisUnit = norm3d(cross3d(alongScreenUnit, this.upVector));
      // TODO: This projection isn't consistent with project3d
      screenMajorAxis = [alongScreenUnit[0], (alongScreenUnit[1] - alongScreenUnit[2]) / Math.sqrt(2)];
      screenMinorAxis = [minorDiscAxisUnit[0], (minorDiscAxisUnit[1] - minorDiscAxisUnit[2]) / Math.sqrt(2)];
    } else {
      // If upVector = intoScreenAxis or -intoScreenAxis, the disc is a circle
      screenMajorAxis = [1, 0];
      screenMinorAxis = [0, 1];
    }

    const shadowPosition = project2d(this.position);
    let shadowMajorAxis;
    let shadowMinorAxis;
    const verticalAxis = [0, 0, 1];
    if (mag3d(cross3d(this.upVector, verticalAxis)) > 0) {
      const alongGroundAxis = norm3d(cross3d(this.upVector, verticalAxis));
      const minorDiscAxisUnit = norm3d(cross3d(alongGroundAxis, this.upVector));

      shadowMajorAxis = alongGroundAxis.slice(0, 2);
      shadowMinorAxis = minorDiscAxisUnit.slice(0, 2);
    } else {
      //if upVector = verticalAxis or -verticalAxis, the shadow is a circle
      shadowMajorAxis = [1, 0];
      shadowMinorAxis = [0, 1];
    }

    frameBuffer.drawOperation(this.position[1], context => {
      context.fillStyle = 'white';
      context.beginPath();
      context.ellipse(
          screenPosition[0],
          screenPosition[1],
          mag2d(screenMajorAxis) * DISC_SIZE,
          mag2d(screenMinorAxis) * DISC_SIZE,
          Math.atan2(screenMajorAxis[1], screenMajorAxis[0]),
          0,
          Math.PI * 2);
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = 'white';
      context.beginPath();
      context.ellipse(
          screenPosition[0],
          screenPosition[1],
          mag2d(screenMajorAxis) * DISC_SIZE,
          mag2d(screenMinorAxis) * DISC_SIZE,
          Math.atan2(screenMajorAxis[1], screenMajorAxis[0]),
          0,
          Math.PI * 2);
      context.stroke();

      if (!this.grounded) {
        context.globalAlpha = 0.2;
        context.fillStyle = 'black';
        context.beginPath();
        context.ellipse(
            shadowPosition[0],
            shadowPosition[1],
            mag2d(shadowMajorAxis) * DISC_SIZE,
            mag2d(shadowMinorAxis) * DISC_SIZE,
            Math.atan2(shadowMajorAxis[1], shadowMajorAxis[0]),
            0,
            Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }
    });
  }

  applyFriction(amount) {
    if (typeof amount === 'number') {
      this.velocity = mul3d(this.velocity, 1 - amount);
    } else if (amount instanceof Array) {
      this.velocity = mul3d(this.velocity, amount.map(a => 1 - a));
    } else {
      throw new Error('Unexpected argument: ' + amount);
    }
  }

  updatePosition() {
    this.position = add3d(this.position, this.velocity);
  }

  updatePhysics() {
    if (!this.position) { throw new Error('Cannot updatePhysics for a held disc!'); }
    this.updatePosition();
    this.velocity = add3d(this.velocity, [0, 0, -GRAVITY]);

    if (this.position[2] <= 0) {
      // Ground contact
      this.position = mul3d(this.position, [1, 1, 0]);
      this.velocity = mul3d(this.velocity, [1 - GROUND_FRICTION, 1 - GROUND_FRICTION, 0]);
      this.upVector = [0, 0, 1];
      this.grounded = true;
    } else {
      // Flight
      const speed = mag3d(this.velocity);
      const velocityDirection = mul3d(this.velocity, 1 / speed);
      const sideDirection = norm3d(cross3d(velocityDirection, this.upVector));
      let liftDirection = cross3d(velocityDirection, sideDirection);
      if (magnitudeAlong3d(liftDirection, this.upVector) < 0) { liftDirection = mul3d(liftDirection, -1); }

      const angleOfAttack = this.angleOfAttack();

      const drag = mul3d(
          velocityDirection,
          -Math.pow(speed, 2) * (DRAG_CONST + Math.pow(angleOfAttack - OPTIMAL_DRAG_ANGLE, 2) * DRAG_QUADRATIC));
      const lift = mul3d(
          liftDirection,
          Math.pow(speed, 2) * (LIFT_CONST + angleOfAttack * LIFT_LINEAR));
      const acceleration = add3d(drag, lift);
      this.velocity = add3d(this.velocity, acceleration);
    }
  }

  angleOfAttack() {
    const velocityDirection = norm3d(this.velocity);
    if (dist3d(velocityDirection, this.upVector) === 0) { return Math.PI / 2; }
    // Get a side unit vector perpendicular to velocityDirection and upVector
    const sideDirection = norm3d(cross3d(velocityDirection, this.upVector));
    // Get a forward unit vector in the plane of velocityDirection/upVector
    let forwardDirection = cross3d(this.upVector, sideDirection);
    if (magnitudeAlong3d(forwardDirection, velocityDirection) < 0) {
      forwardDirection = mul3d(forwardDirection, -1);
    }

    // Calculate angle of attack using dot product identity
    let angleOfAttack = Math.acos(dot3d(forwardDirection, velocityDirection));
    if (angleOfAttack > Math.PI / 2) { angleOfAttack = angleOfAttack - Math.PI; }
    // Convention: if forwardDirection is more +z than velocityDirection, angleOfAttack is positive
    return magnitudeAlong3d(sub3d(forwardDirection, velocityDirection), [0, 0, 1]) > 0
        ? Math.abs(angleOfAttack)
        : -Math.abs(angleOfAttack);
  }

  // returns the player who catches the disc, or undefined
  tryCatch(players) {
    let catchCandidate;
    let catchDist;
    for (let player of players) {
      let d = dist3d(player.position.concat(ARM_HEIGHT), this.position);
      if (d < (catchDist || ARM_LENGTH)) {
        catchCandidate = player;
        catchDist = d;
      }
    }
    return catchCandidate;
  }

  // returns the player who picks up the disc, or undefined
  tryPickup(players) {
    let pickupCandidate;
    let pickupDist;
    for (let player of players) {
      let d = dist2d(player.position, this.position);
      if (d < (pickupDist || MAX_PICKUP_DIST)) {
        pickupCandidate = player;
        pickupDist = d;
      }
    }
    return pickupCandidate;
  }

  // Update disc, including catch/pickup and grounding events.
  update() {
    if (this.isLoose()) {
      const wasGrounded = this.grounded;

      this.updatePhysics();

      if (this.grounded) {
        if (!wasGrounded) { this.game.discGrounded(); }
        let picker = this.tryPickup(this.game.offensiveTeam().players);
        if (picker) {
          this.setPlayer(picker);
          this.game.discPickedUpBy(picker);
        }
      } else {
        let catchCandidates = this.game.state == STATES.Pickup
            ? this.game.offensiveTeam().players
            : this.game.allPlayers().filter(p => p != this.game.lastThrower);
        let catcher = this.tryCatch(catchCandidates);
        if (catcher) {
          this.setPlayer(catcher);
          this.game.discCaughtBy(catcher);
        }
      }
    } else {
      this.updatePosition();
    }
  }

  // returns a unit upVector which results in the given angleOfAttack for the
  // given velocity
  // TODO: add lateral tilt
  static createUpVector(velocity, angleOfAttack) {
    check3d(velocity);
    check1d(angleOfAttack);
    if (mag3d(velocity) === 0) { return [0, 0, 1]; }
    // Construct an orthogonal basis of unit vectors
    const velocityDirection = norm3d(velocity);
    const sideDirection = norm3d(cross3d(velocityDirection, [0, 0, 1]));
    const liftDirection = cross3d(sideDirection, velocityDirection);

    // return velocityDirection rotated upwards by angleOfAttack using the
    // formula: velocityDirection * cos(angleOfAttack) + liftDirection * sin(angleOfAttack)
    let result = add3d(
        mul3d(velocityDirection, -Math.sin(angleOfAttack)),
        mul3d(liftDirection, Math.cos(angleOfAttack)));
    return result;
  }

  // returns [interceptor, interceptionTime] or [null, groundedTime]
  static simulateInterceptions(initialPosition, initialVelocity, upVector, defenders) {
    const disc = new Disc()
        .setPosition(check3d(initialPosition))
        .setVelocity(check3d(initialVelocity))
        .setUpVector(upVector);
    let time = 0;
    while (!disc.grounded) {
      let catcher = disc.tryCatch(defenders);
      if (catcher) { return [catcher, time]; }
      disc.updatePhysics();
      time++;
    }
    return [null, time];
  }

  // returns [groundedPosition, groundedTime]
  static simulateUntilGrounded(initialPosition, initialVelocity, upVector) {
    const disc = new Disc()
        .setPosition(check3d(initialPosition))
        .setVelocity(check3d(initialVelocity))
        .setUpVector(upVector);
    let time = 0;
    while (!disc.grounded) {
      time++;
      disc.updatePhysics();
    }
    return [disc.position, time]
  }
}
