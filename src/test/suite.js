
import {dist2d, dist3d} from '../math_utils.js';

export class TestSuite {
  constructor() { this.tests = []; }

  test(name, test) { this.tests.push([ name, test ]); }

  runTests(onSuccess, onFailure) {
    for (let [name, test] of this.tests) {
      try {
        test();
        onSuccess(name);
      } catch (error) {
        onFailure(name, error);
      }
    }
  }
}

export const expect = {
  true : value => {
    if (!value) {
      throw new Error('Expected true but was ' + value);
    }
  },
  equalsWithin : (a, b, tolerance = 0.0001) => {
    if (Math.abs(a - b) > tolerance) {
      throw new Error('Expected ' + a + ' equalsWithin[' + tolerance + '] ' +
                      b);
    }
  },
  equals2d : (a, b, tolerance = 0.0001) => {
    if (!(dist2d(a, b) <= tolerance)) {
      throw new Error('Expected ' + a + ' equals2d[' + tolerance + '] ' + b +
                      '; diff is ' + dist2d(a, b));
    }
  },
  equals3d : (a, b, tolerance = 0.0001) => {
    if (!(dist3d(a, b) <= tolerance)) {
      throw new Error('Expected ' + a + ' equals3d[' + tolerance + '] ' + b +
                      '; diff is ' + dist3d(a, b));
    }
  },
};