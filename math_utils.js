
export function dist2d(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

export function dist3d(a, b) {
  return Math.sqrt(
      Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
}

export function linearInterpolate(from, to, amount) {
  return from + (to - from) * amount;
}

export function add2d(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

export function sub2d(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

export function mul2d(vector, multiplier) {
  if (isFinite(multiplier)) {
    return [vector[0] * multiplier, vector[1] * multiplier]
  } else if (multiplier instanceof Array) {
    return [vector[0] * multiplier[0], vector[1] * multiplier[1]]
  } else {
    console.log('Cannot multiply by ' + multiplier);
    return [NaN, NaN]
  }
}

export function mag2d(vector) {
  return Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
}

export function getVector(direction) {
  switch (direction) {
    case 'E': return [1, 0]
    case 'W': return [-1, 0]
    case 'S': return [0, 1]
    case 'N': return [0, -1]
    case 'NE': return [1, -1]
    case 'SE': return [1, 1]
    case 'NW': return [-1, -1]
    case 'SW': return [-1, 1]
    default:
      throw new Error('Invalid direction: ' + direction);
  }
}

// Project from rect 110x40 to trapezoid 410/890x344 offset 50x60
export function project2d(position) {
  let xShrinkFactor = linearInterpolate(830/890, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 890/110 + 50;
  let yPosition = 60 + position[1] * 344/40;
  return [xPosition, yPosition];
}

// Project from cuboid 110x40xInf to trapezoid 830/890x344 offset 50x60
export function project3d(position) {
  let xShrinkFactor = linearInterpolate(830/890, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 890/110 + 50;
  let yPosition = 60 + (position[1] - position[2] / 2) * 344/40;
  return [xPosition, yPosition];
}
