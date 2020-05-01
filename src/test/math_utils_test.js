
import {inverseProject2d, project2d} from '../math_utils.js';

import {expect, TestSuite} from './suite.js';

export class MathUtilsTest extends TestSuite {
  constructor() {
    super();
    this.test('inverseProject2d sanity', () => {
      for (let i = 0; i < 110; i += 10) {
        for (let j = 0; j < 40; j += 10) {
          expect.equals2d([ i, j ], inverseProject2d(project2d([ i, j ])));
          expect.equals2d([ i, j ], project2d(inverseProject2d([ i, j ])));
        }
      }
    });
  }
}
