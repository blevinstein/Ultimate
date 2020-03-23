
import { recolorImages } from './image_utils.js';
import { Player } from './player.js';

export class Team {
  constructor(resources, colorMapping) {
    this.colorMapping = colorMapping;
    this.players = [];
    this.score = 0;

    this.resources = {runningSprites: {}, standingSprites: {}};
    Object.keys(resources.runningSprites).forEach((direction) => {
      recolorImages(resources.runningSprites[direction], this.colorMapping).then((coloredImages) => {
        this.resources.runningSprites[direction] = coloredImages;
      });
      const standingSprites = [resources.standingSprites[direction]];
      recolorImages(standingSprites, this.colorMapping).then((coloredImages) => {
        this.resources.standingSprites[direction] = coloredImages[0];
      });
    });
  }

  draw(context) {
    for (let player of this.players) {
      player.draw(context);
    }
  }

  addPlayer(initialPosition, initialDirection = undefined) {
    this.players.push(new Player(this.resources, initialPosition, initialDirection));
    return this;
  }

  addPlayers(leftSide) {
    const xPosition = leftSide ? 20 : 90;
    for (let i = 0; i < 7; i++) {
      this.addPlayer([xPosition, 40 * (i+0.5) / 7], leftSide ? 'E' : 'W');
    }
    return this;
  }

  clearPlayers() {
    this.players = [];
    return this;
  }
}
