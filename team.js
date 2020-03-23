
import { recolorImages } from './image_utils.js';
import { Player } from './player.js';

export class Team {
  constructor(resources, colorMapping) {
    this.colorMapping = colorMapping;
    this.players = [];

    this.runningSprites = {};
    this.standingSprites = {};
    Object.keys(resources.runningSprites).forEach((direction) => {
      recolorImages(resources.runningSprites[direction], this.colorMapping).then((coloredImages) => {
        this.runningSprites[direction] = coloredImages;
      });
      const standingSprites = [resources.standingSprites[direction]];
      recolorImages(standingSprites, this.colorMapping).then((coloredImages) => {
        this.standingSprites[direction] = coloredImages[0];
      });
    });
  }

  draw(context) {
    for (let player of this.players) {
      player.draw(context);
    }
  }

  addPlayer(initialPosition) {
    this.players.push(new Player(this.runningSprites, this.standingSprites, initialPosition));
  }

  addPlayers(leftSide) {
    const xPosition = leftSide ? 20 : 90;
    for (let i = 0; i < 7; i++) {
      this.addPlayer([xPosition, 40 * (i+1) / (7+1)]);
    }
  }
}
