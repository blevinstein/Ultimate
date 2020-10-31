const {
  project3d
} = require('./math_utils.js');
const {
  ARM_HEIGHT,
  ARM_LENGTH
} = require('./player_params.js');

module.exports.drawPath = (frameBuffer, path, alpha = 1) => {
  // Separate path into segments colored by catchable/uncatchable
  const segments = [];
  const isCatchable = (point) => point.position[2] <= ARM_HEIGHT + ARM_LENGTH;
  let pathIndex = 0;
  while (pathIndex < path.length) {
    const currentCatchable = isCatchable(path[pathIndex]);
    const startIndex = pathIndex;
    do {
      pathIndex++;
    } while (pathIndex < path.length && isCatchable(path[pathIndex]) == currentCatchable);
    segments.push({
      color: currentCatchable ? 'blue' : '#49ff29',
      points: path.slice(startIndex, pathIndex).map(point => project3d(point.position))
    });
  }

  for (let segment of segments) {
    frameBuffer.drawOperation(/*depth=*/ 1, context => {
      const screenPath = segment.points;
      context.globalAlpha = alpha;
      context.strokeStyle = segment.color;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(...screenPath[0]);
      for (let i = 1; i < screenPath.length; i++) {
        context.lineTo(...screenPath[i]);
      }
      context.stroke();
      context.globalAlpha = 1;
    });
  }
};
