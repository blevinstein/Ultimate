
import {Disc} from './disc.js';
import {mag2d, mul2d, zRotate3d} from './math_utils.js';
import {ARM_HEIGHT} from './player.js';

const VELOCITY_STEP = 0.03;
const ANGLE_STEP = 0.03;

const MAX_LAUNCH_ANGLE = 0.5;
const MIN_LAUNCH_ANGLE = -0.3;

const MIN_ANGLE_OF_ATTACK = -0.8;
const MAX_ANGLE_OF_ATTACK = 0.8;

const MIN_TILT = 0;
const MAX_TILT = 0;

const RANGE_TOLERANCE = 2;

export class RangeFinderFactory {
  static create(maxSpeed) {
    RangeFinderFactory.registry = RangeFinderFactory.registry || new Map;
    let key = `maxSpeed=${maxSpeed}`;
    let existing = RangeFinderFactory.registry.get(key);
    if (existing) {
      return existing;
    } else {
      let rangeFinder = new RangeFinder(maxSpeed);
      RangeFinderFactory.registry.set(key, rangeFinder);
      return rangeFinder;
    }
  }
}

export class RangeFinder {
  constructor(maxSpeed) {
    this.maxSpeed = maxSpeed;
    this.samples = [];

    for (let launchAngle = MIN_LAUNCH_ANGLE; launchAngle <= MAX_LAUNCH_ANGLE;
         launchAngle += ANGLE_STEP) {
      for (let speed = VELOCITY_STEP; speed <= maxSpeed;
           speed += VELOCITY_STEP) {
        for (let angleOfAttack = MIN_ANGLE_OF_ATTACK;
             angleOfAttack <= MAX_ANGLE_OF_ATTACK;
             angleOfAttack += ANGLE_STEP) {
          for (let tiltAngle = MIN_TILT; tiltAngle <= MAX_TILT;
               tiltAngle += ANGLE_STEP) {
            const velocity = [
              speed * Math.cos(launchAngle), 0, speed * Math.sin(launchAngle)
            ];
            const {
              finalPosition : catchablePosition,
              finalTime : catchableTime
            } =
                Disc.simulateUntilCatchable(
                    [ 0, 0, ARM_HEIGHT + 0.01 ], velocity,
                    Disc.createUpVector(velocity, angleOfAttack, tiltAngle));
            const {finalPosition : groundedPosition, finalTime : groundedTime} =
                Disc.simulateUntilCatchable(
                    [ 0, 0, ARM_HEIGHT + 0.01 ], velocity,
                    Disc.createUpVector(velocity, angleOfAttack, tiltAngle));

            // Rotate everything by catchableAngle such that
            // rotatedCatchablePosition[1] ~ 0
            const catchableAngle =
                Math.atan2(catchablePosition[1], catchablePosition[0]);
            const rotatedCatchablePosition =
                zRotate3d(catchablePosition, -catchableAngle);

            const rotatedVelocity = zRotate3d(velocity, -catchableAngle);

            const rotatedGroundedPosition =
                zRotate3d(groundedPosition, -catchableAngle);
            if (Math.abs(rotatedCatchablePosition[1]) > 0.001) {
              throw new Error('Failed to rotate point onto x-axis!');
            }
            this.samples.push({
              input : {velocity : rotatedVelocity, angleOfAttack, tiltAngle},
              catchable :
                  {position : rotatedCatchablePosition, time : catchableTime},
              grounded :
                  {position : rotatedGroundedPosition, time : groundedTime},
            });
          }
        }
      }
    }
    this.samples.sort((a, b) =>
                          a.catchable.position[0] - b.catchable.position[0]);
    console.log('Range finder ready. maxDistance = ' + this.getMaxDistance());
  }

  // Return the index of the closest sample with catchable distance at least
  // 'distance'
  binarySearch(samples, distance) {
    let min = 0;
    let max = samples.length - 1;
    while (max - min > 1) {
      let mid = Math.trunc((min + max) / 2);
      if (samples[mid].catchable.position[0] > distance) {
        max = mid;
      } else {
        min = mid;
      }
    }
    return max;
  }

  getBestSample(distanceRange, minRunTime) {
    check2d(distanceRange);
    if (distanceRange[1] < distanceRange[0]) {
      throw new Error(`distanceRange is in the wrong order: ${distanceRange}`);
    }
    // Ensure our desired distance is in the range covered by our samples.
    if (this.samples[0].catchable.position[0] > distanceRange[1] ||
        this.samples[this.samples.length - 1].catchable.position[0] <
            distanceRange[0]) {
      return null;
    }
    // Use binary search to find the min and max samples in the given range.
    const minSample = this.binarySearch(this.samples, distanceRange[0]);
    const maxSample = this.binarySearch(this.samples, distanceRange[1]) - 1;
    // Filter to samples which give the runner sufficient time to reach the
    // disc.
    const filteredSamples = this.samples.slice(minSample, maxSample)
                                .filter(s => s.grounded.time > minRunTime);
    if (filteredSamples.length === 0) {
      return null;
    }
    // Choose the throw that will float the longest.
    let bestFloat = null;
    let bestFloatTime;
    for (let i = 0; i < filteredSamples.length; ++i) {
      const floatTime =
          filteredSamples[i].groundedTime - filteredSamples[i].catchableTime;
      if (bestFloat === null || floatTime > bestFloat) {
        bestFloat = i;
        bestFloatTime = floatTime;
      }
    }
    return filteredSamples[bestFloat];
  }

  getMaxDistance() {
    return this.samples[this.samples.length - 1].catchable.position[0];
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getThrowParams(vector2d, minRunTime) {
    const sample = this.getBestSample(
        [
          mag2d(vector2d) - RANGE_TOLERANCE, mag2d(vector2d) + RANGE_TOLERANCE
        ],
        minRunTime);
    if (!sample) {
      return null;
    }
    const {velocity, angleOfAttack, tiltAngle} = sample.input;
    const vectorAngle = Math.atan2(vector2d[1], vector2d[0]);
    const rotatedVelocity = zRotate3d(velocity, vectorAngle);
    return [ rotatedVelocity, angleOfAttack, tiltAngle ];
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getLongestThrowParams(vector2d) {
    const {velocity, angleOfAttack, tiltAngle} =
        this.samples[this.samples.length - 1].input;
    const vectorAngle = Math.atan2(vector2d[1], vector2d[0]);
    const rotatedVelocity = zRotate3d(velocity, vectorAngle);
    return [ rotatedVelocity, angleOfAttack, tiltAngle ];
  }
}
