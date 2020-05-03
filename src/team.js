const {
  recolorImages
} = require('./image_utils.js');
const {
  Player
} = require('./player.js');

const NUM_PLAYERS = 7;
module.exports = {
  NUM_PLAYERS
};

module.exports.Team = class Team {
  constructor(game, coach, textColor, colorMapping, goalDirection) {
    Team.maxId = Team.maxId || 0;
    this.id = Team.maxId++;

    this.game = game;
    this.coach = coach;
    this.textColor = textColor;
    this.colorMapping = colorMapping;
    this.players = [];
    this.score = 0;
    this.goalDirection = goalDirection;
    this.onOffense = false;

    if (game.resources) {
      // Change color of sprites based on colorMapping
      this.resources = {
        runningSprites: {},
        standingSprites: {}
      };
      Object.keys(game.resources.runningSprites).forEach((direction) => {
        recolorImages(game.resources.runningSprites[direction],
            this.colorMapping)
          .then((coloredImages) => {
            this.resources.runningSprites[direction] = coloredImages;
          });
        const standingSprites = [game.resources.standingSprites[direction]];
        recolorImages(standingSprites, this.colorMapping)
          .then((coloredImages) => {
            this.resources.standingSprites[direction] = coloredImages[0];
          });
      });
    }
  }
  toString() {
    return 'Team[' + this.id + ']';
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
    for (let i = 0; i < NUM_PLAYERS; i++) {
      this.addPlayer([xPosition, 40 * (i + 0.5) / NUM_PLAYERS],
        leftSide ? 'E' : 'W');
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