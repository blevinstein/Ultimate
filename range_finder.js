
import { mag2d, mul2d } from './math_utils.js';
import { Disc } from './disc.js';

const VELOCITY_STEP = 0.1;
const MAX_LAUNCH_ANGLE = Math.PI / 4;
const MIN_ANGLE_OF_ATTACK = -Math.PI / 6;
const MAX_ANGLE_OF_ATTACK = Math.PI / 6;
const MIN_TILT = -Math.PI / 4;
const MAX_TILT = Math.PI / 4;
const ANGLE_STEP = Math.PI / 24;

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

    for (let xVelocity = VELOCITY_STEP; xVelocity <= maxSpeed; xVelocity += VELOCITY_STEP) {
      // Calculate max y component which keeps |velocity| < maxSpeed and respect MAX_LAUNCH_ANGLE
      let maxZVelocity = Math.min(
          Math.sqrt(Math.pow(maxSpeed, 2) - Math.pow(xVelocity, 2)),
          xVelocity * Math.sin(MAX_LAUNCH_ANGLE));
      for (let zVelocity = VELOCITY_STEP; zVelocity <= maxZVelocity; zVelocity += VELOCITY_STEP) {
        for (let angleOfAttack = MIN_ANGLE_OF_ATTACK; angleOfAttack <= MAX_ANGLE_OF_ATTACK; angleOfAttack += ANGLE_STEP) {
          for (let tiltAngle = MIN_TILT; tiltAngle <= MAX_TILT; tiltAngle += ANGLE_STEP) {
            let velocity = [xVelocity, 0, zVelocity];
            this.samples.push({
              input: [xVelocity, zVelocity, angleOfAttack, tiltAngle],
              output: Disc.simulateUntilGrounded(
                  [0, 0, 0.1],
                  velocity,
                  Disc.createUpVector(velocity, angleOfAttack, tiltAngle)),
            });
          }
        }
      }
    }
    this.samples.sort((a, b) => a.output[0][0] - b.output[0][0]);
    console.log('Range finder ready. maxDistance = ' + this.getMaxDistance());
  }

  getMaxDistance() {
    return this.samples[this.samples.length - 1].output[0][0];
  }

  getBestSample(distance, minTime) {
    let filteredSamples = minTime ? this.samples.filter(s => s.output[1] > minTime) : this.samples;
    if (filteredSamples.length === 0) { return null; }
    // Binary search over filteredSamples to find the nearest sample throw
    let min = 0;
    let max = filteredSamples.length - 1;
    if (filteredSamples[min].output[0][0] > distance || filteredSamples[max].output[0][0] < distance) {
      return null;
    }
    while (max - min > 1) {
      let mid = Math.trunc((min + max) / 2);
      if (filteredSamples[mid].output[0][0] > distance) {
        max = mid;
      } else {
        min = mid;
      }
    }
    return filteredSamples[max];
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getThrowParams(vector2d, minTime) {
    const sample = this.getBestSample(mag2d(vector2d), minTime);
    if (!sample) { return null; }
    const [forward, upward, angleOfAttack, tiltAngle] = sample.input;
    const velocity = mul2d(vector2d, forward / mag2d(vector2d)).concat(upward);
    return [velocity, angleOfAttack, tiltAngle];
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getLongestThrowParams(vector2d) {
    const [forward, upward, angleOfAttack, tiltAngle] = this.samples[this.samples.length - 1].input;
    const velocity = mul2d(vector2d, forward / mag2d(vector2d)).concat(upward);
    return [velocity, angleOfAttack, tiltAngle];
  }
}
