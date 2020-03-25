
// Records all drawImage calls, then replays them in order of increasing
// y-coordinate.
export class FrameBuffer {
  constructor() {
    this.sprites = [];
  }

  drawImage(image, screenX, screenY, y) {
    this.sprites.push({
      image,
      screenX,
      screenY,
      y
    });
  }

  drawScene(context) {
    this.sprites.sort((a, b) => a.y - b.y);
    for (let sprite of this.sprites) {
      context.drawImage(sprite.image, sprite.screenX, sprite.screenY);
    }
  }
}
