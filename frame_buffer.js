
// Records all draw actions, then replays them in order of increasing depth
export class FrameBuffer {
  constructor() {
    this.drawOperations = [];
  }

  drawImage(image, screenX, screenY, depth) {
    this.drawOperations.push({
        depth,
        draw: context => context.drawImage(image, screenX, screenY),
    });
  }

  drawEllipse(screenX, screenY, radiusX, radiusY, rotation, depth) {
    this.drawOperations.push({
        depth,
        draw: context =>
            context.drawEllipse(screenX,
                screenY,
                radiusX,
                radiusY,
                rotation,
                0,
                2 * Math.PI),
    });
  }

  drawScene(context) {
    this.drawOperations.sort((a, b) => a.depth - b.depth);
    for (let drawOperation of this.drawOperations) {
      drawOperation.draw(context);
    }
  }
}
