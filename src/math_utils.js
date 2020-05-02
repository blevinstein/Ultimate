

const INV_SQRT_2 = 1 / Math.sqrt(2)
const DIRECTIONS = [ 'E', 'W', 'N', 'S', 'SW', 'SE', 'NW', 'NE' ];

export function getVector(direction) {
  switch (checkDirection(direction)) {
  case 'E':
    return [ 1, 0 ];
  case 'W':
    return [ -1, 0 ];
  case 'S':
    return [ 0, 1 ];
  case 'N':
    return [ 0, -1 ];
  case 'NE':
    return [ INV_SQRT_2, -INV_SQRT_2 ];
  case 'SE':
    return [ INV_SQRT_2, INV_SQRT_2 ];
  case 'NW':
    return [ -INV_SQRT_2, -INV_SQRT_2 ];
  case 'SW':
    return [ -INV_SQRT_2, INV_SQRT_2 ];
  default:
    throw new Error('Invalid direction: ' + direction);
  }
}

export function getDirection(vector) {
  check2d(vector);
  const angle = angle2d(vector);
  if (angle < -7 / 8 * Math.PI || angle > 7 / 8 * Math.PI) {
    return 'W';
  } else if (angle < -5 / 8 * Math.PI) {
    return 'NW';
  } else if (angle < -3 / 8 * Math.PI) {
    return 'N';
  } else if (angle < -1 / 8 * Math.PI) {
    return 'NE';
  } else if (angle > 5 / 8 * Math.PI) {
    return 'SW';
  } else if (angle > 3 / 8 * Math.PI) {
    return 'S';
  } else if (angle > 1 / 8 * Math.PI) {
    return 'SE'
  } else {
    return 'E';
  }
}
export function linearInterpolate(from, to, amount) {
  return from + (to - from) * amount;
}

export function dist3d(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) +
                   Math.pow(a[2] - b[2], 2));
}

export function add3d(a, b) {
  return [ a[0] + b[0], a[1] + b[1], a[2] + b[2] ];
}

export function sub3d(a, b) {
  return [ a[0] - b[0], a[1] - b[1], a[2] - b[2] ];
}

export function mag3d(vector) {
  return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2) +
                   Math.pow(vector[2], 2));
}

export function mul3d(vector, multiplier) {
  if (isFinite(multiplier)) {
    return [
      vector[0] * multiplier, vector[1] * multiplier, vector[2] * multiplier
    ]
  } else if (multiplier instanceof Array) {
    return [
      vector[0] * multiplier[0], vector[1] * multiplier[1],
      vector[2] * multiplier[2]
    ]
  } else {
    throw new Error('Cannot multiply by ' + multiplier);
  }
}

export function dot3d(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

export function cross3d(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function check3d(vector) {
  if (vector.length < 3 || vector.some(elem => isNaN(elem) || !isFinite(elem) ||
                                               typeof elem !== 'number')) {
    throw new Error('Invalid 3d vector: ' + vector);
  }
  return vector;
}

export function norm3d(vector) {
  let mag = mag3d(vector);
  if (mag === 0) {
    throw new Error('Cannot normalize zero vector');
  }
  return mul3d(vector, 1 / mag);
}

// returns the magnitude of 'vector' along 'direction' using this formula:
// vector (dot) direction / |direction|
//   = |vector| * cos(angle between vector and direction)
export function magnitudeAlong3d(vector, direction) {
  let mag = mag3d(direction);
  if (mag === 0) {
    return 0;
  }
  return dot3d(vector, direction) / mag;
}

// Project from cuboid 110x40xInf to trapezoid 830/890x344 offset 50x60
export function project3d(position) {
  let xShrinkFactor = linearInterpolate(830 / 890, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 890 / 110 + 50;
  let yPosition = 60 + (position[1] - position[2]) * 344 / 40;
  return [ xPosition, yPosition ];
}

export function zRotate3d(position, angle) {
  return rotate2d(position, angle).concat(position[2]);
}

export function angle2d(vector) { return Math.atan2(vector[1], vector[0]); }

export function norm2d(vector) {
  let mag = mag2d(vector);
  if (mag === 0) {
    throw new Error('Cannot normalize zero vector');
  }
  return mul2d(vector, 1 / mag);
}

export function check2d(vector) {
  if (vector.length < 2 || vector.some(elem => isNaN(elem) || !isFinite(elem) ||
                                               typeof elem !== 'number')) {
    throw new Error('Invalid 2d vector: ' + vector);
  }
  return vector;
}

export function dist2d(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

export function add2d(a, b) { return [ a[0] + b[0], a[1] + b[1] ]; }

export function sub2d(a, b) {
  check2d(a);
  check2d(b);
  return [ a[0] - b[0], a[1] - b[1] ];
}

export function dot2d(a, b) { return a[0] * b[0] + a[1] * b[1]; }

// returns the magnitude of 'vector' along 'direction' using this formula:
// vector (dot) direction / |direction|
//   = |vector| * cos(angle between vector and direction)
export function magnitudeAlong2d(vector, direction) {
  let mag = mag2d(direction);
  if (mag === 0) {
    return 0;
  }
  return dot2d(vector, direction) / mag;
}

export function mul2d(vector, multiplier) {
  if (isFinite(multiplier)) {
    return [ vector[0] * multiplier, vector[1] * multiplier ]
  } else if (multiplier instanceof Array) {
    return [ vector[0] * multiplier[0], vector[1] * multiplier[1] ]
  } else {
    throw new Error('Cannot multiply by ' + multiplier);
  }
}

export function mag2d(vector) {
  return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
}

// Project from rect 110x40 to trapezoid 830/890x344 offset 50x60
export function project2d(position) {
  let xShrinkFactor = linearInterpolate(830 / 890, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 890 / 110 + 50;
  let yPosition = 60 + position[1] * 344 / 40;
  return [ xPosition, yPosition ];
}

// Inverse of project2d
export function inverseProject2d(screenPosition) {
  let yPosition = (screenPosition[1] - 60) * 40 / 344;
  let xShrinkFactor = linearInterpolate(830 / 890, 1, yPosition / 40);
  let xPosition =
      (((screenPosition[0] - 50) * 110 / 890) - 55) / xShrinkFactor + 55;
  return [ xPosition, yPosition ];
}

export function rotate2d(vector, angle) {
  check2d(vector);
  check1d(angle);
  return [
    Math.cos(angle) * vector[0] - Math.sin(angle) * vector[1],
    Math.cos(angle) * vector[1] + Math.sin(angle) * vector[0]
  ];
}

export function check1d(value) {
  if (isNaN(value) || !isFinite(value) || typeof value !== 'number') {
    throw new Error('Invalid 1d value: ' + value);
  }
  return value;
}

export function checkDirection(value) {
  if (!DIRECTIONS.includes(value)) {
    throw new Error('Invalid direction: ' + value);
  }
  return value;
}

export function installMathUtils(window) {
  for (let name of ['linearInterpolate', 'dist3d', 'add3d', 'sub3d', 'mag3d',
                    'mul3d', 'dot3d', 'cross3d', 'check3d', 'norm3d',
                    'magnitudeAlong3d', 'check2d', 'dist2d', 'add2d', 'sub2d',
                    'dot2d', 'magnitudeAlong2d', 'mul2d', 'mag2d', 'project2d',
                    'project3d', 'inverseProject2d']) {
    window[name] = eval(name);
  }
}
