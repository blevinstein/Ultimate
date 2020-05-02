
const math_assert = require('./math_assert.js');
const {inverseProject2d, project2d} = require('../src/math_utils.js');

describe('math_utils', () => {
  describe('#inverseProject2d', () => {
    it('should pass sanity checks', () => {
      for (let i = 0; i < 110; i += 10) {
        for (let j = 0; j < 40; j += 10) {
          math_assert.equals2d([ i, j ], inverseProject2d(project2d([ i, j ])));
          math_assert.equals2d([ i, j ], project2d(inverseProject2d([ i, j ])));
        }
      }
    });
  });
});

