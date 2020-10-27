const {
  Disc
} = require('./disc.js');
const {
  angle2d,
  check2d,
  mag2d,
  mul2d,
  zRotate3d
} = require('./math_utils.js');
const {
  ARM_HEIGHT
} = require('./player_params.js');

const MAX_LAUNCH_ANGLE = 1.5;
const MIN_LAUNCH_ANGLE = -1.0;

const MIN_ANGLE_OF_ATTACK = -1.0;
const MAX_ANGLE_OF_ATTACK = 1.0;

const MIN_TILT = 0.0;
const MAX_TILT = 0.0;

const MIN_SPEED = 0.3;

// Minimum distance a throw must travel
const MIN_RANGE = 3;

const RANGE_TOLERANCE = 1;

class RangeFinder {
  constructor(maxSpeed, speedStepSize, angleStepSize) {
    this.maxSpeed = maxSpeed;
    this.samples = [];
    this.samplesOmitted = 0;

    for (let launchAngle = MIN_LAUNCH_ANGLE; launchAngle
      <= MAX_LAUNCH_ANGLE; launchAngle +=
      angleStepSize) {
      for (let speed = MIN_SPEED; speed <= maxSpeed; speed += speedStepSize) {
        for (let angleOfAttack = MIN_ANGLE_OF_ATTACK; angleOfAttack
          <= MAX_ANGLE_OF_ATTACK; angleOfAttack += angleStepSize) {
          for (let tiltAngle = MIN_TILT; tiltAngle <= MAX_TILT; tiltAngle +=
            angleStepSize) {
            const velocity = [
              speed * Math.cos(launchAngle), 0, speed * Math.sin(
                launchAngle)
            ];
            const {
              finalPosition: catchablePosition,
              finalTime: catchableTime
            } =
            Disc.simulateUntilCatchable(
              [0, 0, ARM_HEIGHT + 0.01], velocity,
              Disc.createUpVector({
                velocity,
                angleOfAttack,
                tiltAngle
              }));
            const {
              finalPosition: uncatchablePosition,
              finalTime: uncatchableTime
            } =
            Disc.simulateUntilUncatchable(
              [0, 0, ARM_HEIGHT + 0.01], velocity,
              Disc.createUpVector({
                velocity,
                angleOfAttack,
                tiltAngle
              }));

            // Rotate everything by uncatchableAngle such that
            // rotatedUncatchablePosition[1] ~ 0
            const uncatchableAngle = angle2d(uncatchablePosition);
            const rotatedCatchablePosition =
              zRotate3d(catchablePosition, -uncatchableAngle);

            const rotatedVelocity = zRotate3d(velocity, -uncatchableAngle);

            const rotatedUncatchablePosition =
              zRotate3d(uncatchablePosition, -uncatchableAngle);
            if (Math.abs(rotatedUncatchablePosition[1]) > 0.001) {
              throw new Error('Failed to rotate point onto x-axis!');
            }
            if (rotatedUncatchablePosition[0] > MIN_RANGE) {
              this.samples.push({
                input: {
                  velocity: rotatedVelocity,
                  angleOfAttack,
                  tiltAngle
                },
                catchable: {
                  position: rotatedCatchablePosition,
                  time: catchableTime
                },
                uncatchable: {
                  position: rotatedUncatchablePosition,
                  time: uncatchableTime
                },
              });
            } else {
              ++this.samplesOmitted;
            }
          }
        }
      }
    }
    this.samples.sort((a, b) =>
      a.uncatchable.position[0] - b.uncatchable.position[0]);
    console.log(
      `Range finder ready. samples = ${this.samples.length}, omitted = ${
            this.samplesOmitted}, maxDistance = ${this.getMaxDistance()}`);
  }

  // Return the index of the closest sample with uncatchable distance at least
  // 'distance'
  binarySearch(samples, distance) {
    let min = 0;
    let max = samples.length - 1;
    while (max - min > 1) {
      let mid = Math.trunc((min + max) / 2);
      if (samples[mid].uncatchable.position[0] > distance) {
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
      throw new Error(
        `distanceRange is in the wrong order: ${distanceRange}`);
    }
    // Ensure our desired distance is in the range covered by our samples.
    if (this.samples[0].uncatchable.position[0] > distanceRange[1]
      || this.samples[this.samples.length - 1].uncatchable.position[0]
      < distanceRange[0]) {
      return null;
    }
    // Use binary search to find the min and max samples in the given range.
    const minSample = this.binarySearch(this.samples, distanceRange[0]);
    const maxSample = this.binarySearch(this.samples, distanceRange[1]) - 1;
    // Filter to samples which give the runner sufficient time to reach the
    // disc.
    const filteredSamples = this.samples.slice(minSample, maxSample)
      .filter(s => s.uncatchable.time > minRunTime);
    if (filteredSamples.length === 0) {
      return null;
    }
    // Choose the throw that will float the longest.
    let bestFloat = null;
    let bestFloatTime;
    for (let i = 0; i < filteredSamples.length; ++i) {
      const floatTime =
        filteredSamples[i].uncatchable.time - filteredSamples[i].catchable.time;
      if (bestFloat === null || floatTime > bestFloat) {
        bestFloat = i;
        bestFloatTime = floatTime;
      }
    }
    return filteredSamples[bestFloat];
  }

  getMaxDistance() {
    return this.samples[this.samples.length - 1].uncatchable.position[0];
  }

  getThrowParams(vector2d, minRunTime) {
    const sample = this.getBestSample(
      [mag2d(vector2d) - RANGE_TOLERANCE, mag2d(vector2d)], minRunTime);
    if (!sample) {
      return null;
    }
    const {
      velocity,
      angleOfAttack,
      tiltAngle
    } = sample.input;
    const vectorAngle = angle2d(vector2d);
    const rotatedVelocity = zRotate3d(velocity, vectorAngle);
    return {
      velocity: rotatedVelocity,
      angleOfAttack,
      tiltAngle
    };
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getLongestThrowParams(vector2d) {
    const {
      velocity,
      angleOfAttack,
      tiltAngle
    } =
    this.samples[this.samples.length - 1].input;
    const vectorAngle = angle2d(vector2d);
    const rotatedVelocity = zRotate3d(velocity, vectorAngle);
    return {
      velocity: rotatedVelocity,
      angleOfAttack,
      tiltAngle
    };
  }
}

class RangeFinderFactory {
  static create(maxSpeed, speedStepSize = 0.6, angleStepSize = 0.05) {
    RangeFinderFactory.registry = RangeFinderFactory.registry || new Map;
    let key = `maxSpeed=${maxSpeed},speedStepSize=${speedStepSize},angleStepSize=${angleStepSize}`;
    let existing = RangeFinderFactory.registry.get(key);
    if (existing) {
      return existing;
    } else {
      let rangeFinder = new RangeFinder(maxSpeed, speedStepSize, angleStepSize);
      RangeFinderFactory.registry.set(key, rangeFinder);
      return rangeFinder;
    }
  }
}

module.exports = {
  RangeFinder,
  RangeFinderFactory
};
