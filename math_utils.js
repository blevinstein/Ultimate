
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
