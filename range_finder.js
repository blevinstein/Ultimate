
import { mag2d, mul2d } from './math_utils.js';
import { Disc } from './disc.js';

const STEP = 0.1;

export class RangeFinder {
  constructor(maxSpeed) {
    this.maxSpeed = maxSpeed;
    this.samples = [];

    for (let i = STEP; i < maxSpeed; i += STEP) {
      for (let j = STEP; j <= i; j += STEP) {
        if (mag2d([i, j]) < maxSpeed) {
          this.samples.push({
            input: [i, j],
            output: Disc.simulateUntilGrounded([0, 0, 0.1], [i, 0, j])
          });
        }
      }
    }
    this.samples.sort((a, b) => a.output[0][0] - b.output[0][0]);
  }

  // returns [forwardSpeed, upwardSpeed]
  getParams(distance, minTime) {
    let filteredSamples = minTime ? this.samples.filter(s => s.output[1] > minTime) : this.samples;
    if (filteredSamples.length === 0) { return null; }
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
    console.log('Chose sample: ' + filteredSamples[min].input + ' => ' + filteredSamples[min].output);
    console.log('Chose sample: ' + filteredSamples[max].input + ' => ' + filteredSamples[max].output);
    return filteredSamples[max].input;
  }

  getThrowVector(vector2d, minTime) {
    let params = this.getParams(mag2d(vector2d), minTime);
    if (!params) { return null; }
    let [forward, upward] = params;
    let vector3d = mul2d(vector2d, forward / mag2d(vector2d)).concat(upward);
    let [simulatedDisplacement] = Disc.simulateUntilGrounded([0, 0, 0.1], vector3d);
    console.log('requested ' + vector2d + ' actual ' + simulatedDisplacement);
    return vector3d;
  }
}
