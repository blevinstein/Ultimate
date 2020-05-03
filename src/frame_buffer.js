// Records all draw actions, then replays them in order of increasing depth
module.exports.FrameBuffer = class FrameBuffer {
  constructor() {
    this.drawOperations = [];
  }

  drawOperation(depth, draw) {
    this.drawOperations.push({
      depth,
      draw
    });
  }

  drawScene(context) {
    this.drawOperations.sort((a, b) => a.depth - b.depth);
    for (let drawOperation of this.drawOperations) {
      drawOperation.draw(context);
    }
  }

  clear() {
    this.drawOperations = [];
  }
}