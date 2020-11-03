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
  ARM_HEIGHT,
  MAX_THROW_SPEED
} = require('./player_params.js');

const MAX_LAUNCH_ANGLE = 1.0;
const MIN_LAUNCH_ANGLE = -0.5;

const MIN_ANGLE_OF_ATTACK = -0.7;
const MAX_ANGLE_OF_ATTACK = 0.7;

const MIN_TILT = 0.0;
const MAX_TILT = 0.0;

const MIN_SPEED = 0.3;

// Minimum distance a throw must travel
const MIN_RANGE = 2.5;

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
              [0, 0, ARM_HEIGHT], velocity,
              Disc.createUpVector({
                velocity,
                angleOfAttack,
                tiltAngle
              }));
            const {
              finalPosition: uncatchablePosition,
              finalTime: uncatchableTime,
              path
            } =
            Disc.simulateUntilGrounded(
              [0, 0, ARM_HEIGHT], velocity,
              Disc.createUpVector({
                velocity,
                angleOfAttack,
                tiltAngle
              }),
              true);

            // Rotate everything by uncatchableAngle such that
            // rotatedUncatchablePosition[1] ~= 0
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
                path
              });
            } else {
              ++this.samplesOmitted;
            }
          }
        }
      }
    }
    // Find minimum (catchable) distance and maximum (uncatchable) distance
    // across all samples.
    this.minDistance = this.samples.reduce(
        (minDist, sample) => Math.min(minDist, sample.catchable.position[0]),
        this.samples[0].catchable.position[0]);
    this.maxDistance = this.samples.reduce(
        (maxDist, sample) => Math.max(maxDist, sample.uncatchable.position[0]),
        this.samples[0].uncatchable.position[0]);

    console.log(
      `Range finder ready. samples = ${this.samples.length}, omitted = ${
            this.samplesOmitted}, maxDistance = ${this.maxDistance}`);
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

  getSamples(distance, minRunTime) {
    // Ensure our desired distance is in the range covered by our samples.
    if (distance < this.minDistance || distance > this.maxDistance) {
      return [];
    }
    return this.samples.filter(sample =>
        sample.catchable.position[0] <= distance &&
        sample.uncatchable.position[0] >= distance &&
        sample.uncatchable.time >= minRunTime);
  }

  getRandomSample(distance, minRunTime) {
    const filteredSamples = this.getSamples(distance, minRunTime);
    console.log(
      `Found ${filteredSamples.length} candidate samples for distance=${distance}, minRunTime=${minRunTime}`);
    if (!filteredSamples.length) {
      return null;
    }

    const chosenIndex = Math.floor(Math.random() * filteredSamples.length);
    return filteredSamples[chosenIndex];
  }

  getFloatiestSample(distance, minRunTime) {
    const filteredSamples = this.getSamples(distance, minRunTime);
    console.log(
      `Found ${filteredSamples.length} candidate samples for distance=${distance}, minRunTime=${minRunTime}`);
    if (!filteredSamples.length) {
      return null;
    }

    let highestSample = null;
    let highestHeight = 0;
    for (let sample of filteredSamples) {
            const maxHeight = sample.path.reduce((maxHeight, point) => Math.max(maxHeight, point.position[2]), 0);
            if (highestSample === null || maxHeight > highestHeight) {
                      highestSample = sample;
                      highestHeight = maxHeight;
                    }
          }
    return highestSample;
  }

  rotatedThrowParams(vector2d, sample) {
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

  getRandomThrow(vector2d, minRunTime) {
    const sample = this.getRandomSample(mag2d(vector2d), minRunTime);
    if (!sample) {
      return null;
    }
    return this.rotatedThrowParams(vector2d, sample);
  }

  getFloatiestThrow(vector2d, minRunTime) {
    const sample = this.getFloatiestSample(mag2d(vector2d), minRunTime);
    if (!sample) {
      return null;
    }
    return this.rotatedThrowParams(vector2d, sample);
  }

  // returns [velocity, angleOfAttack, tiltAngle]
  getLongestThrowParams(vector2d) {
    const sample = this.samples.reduce((bestSample, sample) =>
        sample.uncatchable.position[0] > bestSample.uncatchable.position[0]
            ? sample : bestSample,
        this.samples[0]);
    return this.rotatedThrowParams(vector2d, sample);
  }
}

class RangeFinderFactory {
  static create(maxSpeed = MAX_THROW_SPEED, speedStepSize = 0.3, angleStepSize = 0.05) {
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
