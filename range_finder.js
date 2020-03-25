
import { mag2d } from './math_utils.js';
import { Disc } from './disc.js';

const HANDLE_HEIGHT = 3;

export class RangeFinder {
  constructor(maxSpeed) {
    this.maxSpeed = maxSpeed;
    this.samples = [];

    for (let i = 0.1; i < maxSpeed; i+= 0.1) {
      for (let j = 0.1; j < i; j+= 0.1) {
        if (mag2d([i, j]) < maxSpeed) {
          this.samples.push({
            input: [i, j],
            output: Disc.simulateUntilGrounded([0, 0, HANDLE_HEIGHT], [i, 0, j])
          });
        }
      }
    }
    this.samples.sort((a, b) => a.output[0][0] - b.output[0][0]);
  }

  // returns [forwardSpeed, upwardSpeed]
  getParams(distance) {
    let min = 0;
    let max = this.samples.length - 1;
    if (this.samples[min].output[0][0] > distance || this.samples[max].output[0][0] < distance) {
      throw new Error('Cannot throw distance ' + distance);
    }
    while (max - min > 1) {
      let mid = Math.trunc((min + max) / 2);
      if (this.samples[mid].output[0][0] > distance) {
        max = mid;
      } else {
        min = mid;
      }
    }
    return this.samples[min].input;
  }
}
