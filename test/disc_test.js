
const math_assert = require('./math_assert.js');
const {Disc} = require('../src/disc.js');

describe('Disc', () => {
  describe('#angleOfAttack()', () => {
    it('should be zero when moving horizontally', () => {
      math_assert.equalsWithin(new Disc()
                              .setPosition([ 0, 0, 0 ])
                              .setVelocity([ 1, 0, 0 ])
                              .setUpVector([ 0, 0, 1 ])
                              .angleOfAttack(),
                          0);
      math_assert.equalsWithin(new Disc()
                              .setPosition([ 0, 0, 0 ])
                              .setVelocity([ 0, 1, 0 ])
                              .setUpVector([ 0, 0, 1 ])
                              .angleOfAttack(),
                          0);
    });
    it('should be PI/2 if rotated upright', () => {
      math_assert.equalsWithin(new Disc()
                              .setPosition([ 0, 0, 0 ])
                              .setVelocity([ 0, 0, 1 ])
                              .setUpVector([ 0, 0, 1 ])
                              .angleOfAttack(),
                          Math.PI / 2);
    });
    it('should be 0 if velocity and upVector are rotated by a constant', () => {
      math_assert.equalsWithin(
         new Disc()
              .setPosition([ 0, 0, 0 ])
              .setVelocity([ Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6) ])
              .setUpVector(
                  [ Math.cos(Math.PI * 2 / 3), 0, Math.sin(Math.PI * 2 / 3) ]).angleOfAttack(), 0);
      math_assert.equalsWithin(
          new Disc()
              .setPosition([ 0, 0, 0 ])
              .setVelocity([ Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6) ])
              .setUpVector(
                  [ Math.cos(Math.PI * 5 / 6), 0, Math.sin(Math.PI * 5 / 6) ])
              .angleOfAttack(),
          Math.PI / 6);
    });
  });

  describe('#createUpVector()', () => {
    it ('should pass sanity checks', () => {
      math_assert.equals3d([ -1 / Math.sqrt(2), 0, 1 / Math.sqrt(2) ],
                      Disc.createUpVector({
                        velocity : [ 1, 0, 0 ],
                        angleOfAttack : Math.PI / 4,
                        tiltAngle : 0
                      }));

      math_assert.equals3d([ 0, -1 / Math.sqrt(2), 1 / Math.sqrt(2) ],
                      Disc.createUpVector({
                        velocity : [ 1, 0, 0 ],
                        angleOfAttack : 0,
                        tiltAngle : Math.PI / 4
                      }));

      math_assert.equals3d([ 0, 1 / Math.sqrt(2), 1 / Math.sqrt(2) ],
                      Disc.createUpVector({
                        velocity : [ 1, 0, 0 ],
                        angleOfAttack : 0,
                        tiltAngle : -Math.PI / 4
                      }));
    });
  });
});
