
import { recolorImages } from './image_utils.js';
import { Player } from './player.js';

export class Team {
  constructor(game, colorMapping, goalDirection) {
    this.game = game;
    this.colorMapping = colorMapping;
    this.players = [];
    this.score = 0;
    this.goalDirection = goalDirection;
    this.onOffense = false;

    // Change color of sprites based on colorMapping
    this.resources = {runningSprites: {}, standingSprites: {}};
    Object.keys(game.resources.runningSprites).forEach((direction) => {
      recolorImages(game.resources.runningSprites[direction], this.colorMapping).then((coloredImages) => {
        this.resources.runningSprites[direction] = coloredImages;
      });
      const standingSprites = [game.resources.standingSprites[direction]];
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

  getPlayers() {
    return this.players.slice(); // Defensive copy
  }

  addPlayer(initialPosition, initialDirection = undefined) {
    this.players.push(new Player(this, initialPosition, initialDirection));
    return this;
  }

  addPlayers(leftSide) {
    const xPosition = leftSide ? 20 : 90;
    for (let i = 0; i < 7; i++) {
      this.addPlayer([xPosition, 40 * (i+0.5) / 7], leftSide ? 'E' : 'W');
    }
    return this;
  }

  setOnOffense(onOffense) {
    this.onOffense = onOffense;
    return this;
  }

  clearPlayers() {
    this.players = [];
    return this;
  }

  hasDisc() {
    return this.players.some(p => p.hasDisc);
  }
}