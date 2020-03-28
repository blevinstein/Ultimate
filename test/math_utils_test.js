
import { project2d, inverseProject2d } from '../math_utils.js';
import { TestSuite, expect } from './suite.js';

const TOL = 0.001;

export class MathUtilsTest extends TestSuite {
  constructor() {
    super();
    this.test('inverseProject2d sanity', () => {
      for (let i = 0; i < 110; i += 10) {
        for (let j = 0 ; j < 40; j += 10) {
          expect.equals2d(
              [i, j],
              inverseProject2d(project2d([i, j])));
        }
      }
    });
  }
}
