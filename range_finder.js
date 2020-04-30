
import { mag2d, mul2d, rotate2d } from './math_utils.js';
import { Disc } from './disc.js';

const VELOCITY_STEP = 0.05;
const ANGLE_STEP = 0.05;

const MAX_LAUNCH_ANGLE = 0.5;
const MIN_LAUNCH_ANGLE = -0.2;

const MIN_ANGLE_OF_ATTACK = -0.5;
const MAX_ANGLE_OF_ATTACK = 0.4;

const MIN_TILT = -1;
const MAX_TILT = 1;

export class RangeFinderFactory {
  static create(maxSpeed) {
    RangeFinderFactory.registry = RangeFinderFactory.registry || new Map;
    let existing = RangeFinderFactory.registry.get(maxSpeed);
    if (existing) {
      return existing;
    } else {
      let rangeFinder = new RangeFinder(maxSpeed);
      RangeFinderFactory.registry.set(maxSpeed, rangeFinder);
      return rangeFinder;
    }
  }
}

export class RangeFinder {
  constructor(maxSpeed) {
    this.maxSpeed = maxSpeed;
    this.samples = [];

    for (let launchAngle = MIN_LAUNCH_ANGLE; launchAngle <= MAX_LAUNCH_ANGLE; launchAngle += ANGLE_STEP) {
      for (let speed = VELOCITY_STEP; speed <= maxSpeed; speed += VELOCITY_STEP) {
        for (let angleOfAttack = MIN_ANGLE_OF_ATTACK; angleOfAttack <= MAX_ANGLE_OF_ATTACK; angleOfAttack += ANGLE_STEP) {
          for (let tiltAngle = MIN_TILT; tiltAngle <= MAX_TILT; tiltAngle += ANGLE_STEP) {
            const velocity = [speed * Math.cos(launchAngle), 0, speed * Math.sin(launchAngle)];
            const {finalPosition, finalTime} = Disc.simulateUntilGrounded(
                  [0, 0, 0.01],
                  velocity,
                  Disc.createUpVector(velocity, angleOfAttack, tiltAngle));
            const groundedAngle = Math.atan2(finalPosition[1], finalPosition[0]);
            const rotatedGrounded = rotate2d([finalPosition[0], finalPosition[1]], -groundedAngle).concat(0);
            const rotatedVelocity = rotate2d(velocity, -groundedAngle).concat(velocity[2]);
            if (Math.abs(rotatedGrounded[1]) > 0.001) { throw new Error('Failed to rotate point onto x-axis!'); }
            this.samples.push({
              input: {velocity: rotatedVelocity, angleOfAttack, tiltAngle},
              output: {location: rotatedGrounded, time: finalTime},
            });
          }
        }
      }
    }
    this.samples.sort((a, b) => a.output.location[0] - b.output.location[0]);
    console.log('Range finder ready. maxDistance = ' + this.getMaxDistance());
  }

  getMaxDistance() {
    return this.samples[this.samples.length - 1].output.location[0];
  }

  // TODO: Fix this code. It currently assumes that all output values are
  // [x, 0, 0], which is NOT true due to tiltAngle.
  getBestSample(distance, minTime) {
    let filteredSamples = minTime ? this.samples.filter(s => s.output.time > minTime) : this.samples;
    if (filteredSamples.length === 0) { return null; }
    // Binary search over filteredSamples to find the nearest sample throw
    let min = 0;
    let max = filteredSamples.length - 1;
    if (filteredSamples[min].output.location[0] > distance || filteredSamples[max].output.location[0] < distance) {
      return null;
    }
    while (max - min > 1) {
      let mid = Math.trunc((min + max) / 2);
      if (filteredSamples[mid].output.location[0] > distance) {
        max = mid;
      } else {
        min = mid;
      }
    }
    return filteredSamples[min];
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getThrowParams(vector2d, minTime) {
    const sample = this.getBestSample(mag2d(vector2d), minTime);
    if (!sample) { return null; }
    const {velocity, angleOfAttack, tiltAngle} = sample.input;
    const vectorAngle = Math.atan2(vector2d[1], vector2d[0]);
    const rotatedVelocity = rotate2d(velocity, vectorAngle).concat(velocity[2]);
    return [rotatedVelocity, angleOfAttack, tiltAngle];
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getLongestThrowParams(vector2d) {
    const {velocity, angleOfAttack, tiltAngle} = this.samples[this.samples.length - 1].input;
    const vectorAngle = Math.atan2(vector2d[1], vector2d[0]);
    const rotatedVelocity = rotate2d(velocity, vectorAngle).concat(velocity[2]);
    return [rotatedVelocity, angleOfAttack, tiltAngle];
  }
}
