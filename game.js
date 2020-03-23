
import { Disc } from './disc.js';
import { Team } from './team.js';

const SHIRT = [224, 80, 0, 255];
const PANTS = [72, 88, 0, 255];
const HAIR = [0, 0, 0, 255];
const SKIN = [255, 200, 184, 255];
const SOCKS = [255, 255, 255, 255];
const BG = [0, 0, 0, 0];
const EYES = [7, 11, 90, 255];

const RED_COLORS = [
  [BG],
  [EYES],
  [SKIN],
  [SHIRT, [255, 0, 0, 255]],
  [PANTS, [200, 0, 0, 255]],
  [SOCKS],
  [HAIR],
];

const BLUE_COLORS = [
  [BG],
  [EYES],
  [SKIN],
  [SHIRT, [0, 0, 255, 255]],
  [PANTS, [0, 0, 200, 255]],
  [SOCKS],
  [HAIR],
];

export class Game {
  constructor(resources) {
    this.fieldSprite = resources.fieldSprite;
    this.teams = [
        new Team(resources, RED_COLORS).addPlayers(false),
        new Team(resources, BLUE_COLORS).addPlayers(true)];
    this.disc = new Disc(resources);
  }

  draw(context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this.fieldSprite, 0, 0);
    for (let team of this.teams) {
      team.draw(context);
    }
    this.disc.draw(context);
  }
}
