
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
      console.log('Invalid direction: ' + direction);
      return [NaN, NaN]
  }
}
