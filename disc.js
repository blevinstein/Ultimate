
import { linearInterpolate } from './math_utils.js';

// Project from cuboid 110x40xInf to trapezoid 410/455x172 offset 25x30
function project(position) {
  let xShrinkFactor = linearInterpolate(415.0/445, 1, position[1] / 40);
  let xPosition = (xShrinkFactor * (position[0] - 55) + 55) * 445.0/110 + 25;
  let yPosition = 30 + (position[1] + position[2]*0.5) * 172.0/40;
  return [xPosition, yPosition];
}

export class Disc {
  constructor(resources, initialPlayer, initialPosition) {
    this.sprite = resources.discSprite;
    if (initialPlayer) {
      setPlayer(initialPlayer);
    } else if (initialPosition) {
      this.setPosition(initialPosition);
    } else {
      this.setPosition([55, 20, 0]);
    }
  }

  setPosition(position) {
    if (this.player) { this.player.setHasDisc(false); }
    this.position = position;
    this.player = null;
  }

  setPlayer(player) {
    if (this.player) { this.player.setHasDisc(false); }
    this.player = player;
    this.player.setHasDisc(true);
    this.position = null;
  }

  draw(context) {
    if (this.position) {
      const screenPosition = project(this.position);
      context.drawImage(
          this.sprite,
          screenPosition[0] - this.sprite.width / 2,
          screenPosition[1] - this.sprite.height / 2);
    }
  }
}
