
import {Disc} from '../disc.js';

import {expect, TestSuite} from './suite.js';

export class DiscTest extends TestSuite {
  constructor() {
    super() this.test('angleOfAttack sanity', () => {
      expect.equalsWithin(new Disc()
                              .setPosition([ 0, 0, 0 ])
                              .setVelocity([ 1, 0, 0 ])
                              .setUpVector([ 0, 0, 1 ])
                              .angleOfAttack(),
                          0);
      expect.equalsWithin(new Disc()
                              .setPosition([ 0, 0, 0 ])
                              .setVelocity([ 0, 1, 0 ])
                              .setUpVector([ 0, 0, 1 ])
                              .angleOfAttack(),
                          0);
      expect.equalsWithin(new Disc()
                              .setPosition([ 0, 0, 0 ])
                              .setVelocity([ 0, 0, 1 ])
                              .setUpVector([ 0, 0, 1 ])
                              .angleOfAttack(),
                          Math.PI / 2);
      expect.equalsWithin(
          new Disc()
              .setPosition([ 0, 0, 0 ])
              .setVelocity([ Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6) ])
              .setUpVector(
                  [ Math.cos(Math.PI * 2 / 3), 0, Math.sin(Math.PI * 2 / 3) ])
              .angleOfAttack(),
          0);
      expect.equalsWithin(
          new Disc()
              .setPosition([ 0, 0, 0 ])
              .setVelocity([ Math.cos(Math.PI / 6), 0, Math.sin(Math.PI / 6) ])
              .setUpVector(
                  [ Math.cos(Math.PI * 5 / 6), 0, Math.sin(Math.PI * 5 / 6) ])
              .angleOfAttack(),
          Math.PI / 6);
    });

    this.test('createUpVector sanity', () => {
      expect.equals3d([ -1 / Math.sqrt(2), 0, 1 / Math.sqrt(2) ],
                      Disc.createUpVector([ 1, 0, 0 ], Math.PI / 4));

      expect.equals3d([ 0, -1 / Math.sqrt(2), 1 / Math.sqrt(2) ],
                      Disc.createUpVector([ 1, 0, 0 ], 0, Math.PI / 4));

      expect.equals3d([ 0, 1 / Math.sqrt(2), 1 / Math.sqrt(2) ],
                      Disc.createUpVector([ 1, 0, 0 ], 0, -Math.PI / 4));
    });
  }
}
