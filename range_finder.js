
import { mag2d, mul2d } from './math_utils.js';
import { Disc } from './disc.js';

const VELOCITY_STEP = 0.1;
const MIN_ANGLE = -Math.PI / 6;
const MAX_ANGLE = Math.PI * 1/3;
const ANGLE_STEP = Math.PI / 12;

export class RangeFinder {
  constructor(maxSpeed) {
    this.maxSpeed = maxSpeed;
    this.samples = [];

    for (let xVelocity = VELOCITY_STEP; xVelocity <= maxSpeed; xVelocity += VELOCITY_STEP) {
      // Calculate max y component which keeps |velocity| < maxSpeed
      let maxZVelocity = Math.sqrt(Math.pow(maxSpeed, 2) - Math.pow(xVelocity, 2));
      for (let zVelocity = VELOCITY_STEP; zVelocity <= maxZVelocity; zVelocity += VELOCITY_STEP) {
        for (let angleOfAttack = MIN_ANGLE; angleOfAttack <= MAX_ANGLE; angleOfAttack += ANGLE_STEP) {
          let velocity = [xVelocity, 0, zVelocity];
          console.log('Intended angleOfAttack: ' + angleOfAttack);
          this.samples.push({
            input: [xVelocity, zVelocity, angleOfAttack],
            output: Disc.simulateUntilGrounded(
                [0, 0, 0.1],
                velocity,
                Disc.createUpVector(velocity, angleOfAttack)),
          });
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

  // returns [velocity, angleOfAttack]
  getThrowParams(vector2d, minTime) {
    const sample = this.getBestSample(mag2d(vector2d), minTime);
    if (!sample) { return null; }
    const [forward, upward, angleOfAttack] = sample.input;
    const velocity = mul2d(vector2d, forward / mag2d(vector2d)).concat(upward);
    console.log('getThrowParams ' + mag2d(vector2d));
    console.log('closest position ' + mag2d(sample.output[0]) + ' (' + sample.output[0] + ')');
    return [velocity, angleOfAttack];
  }
}
