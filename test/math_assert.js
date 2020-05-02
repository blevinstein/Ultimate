
const {dist2d, dist3d} = require('../src/math_utils.js');

module.exports = {
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
