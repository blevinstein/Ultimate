
import { loadImage, splitSprite, mirrorImages } from './image_utils.js';
import { dist2d, mag2d, sub2d } from './math_utils.js';
import { Disc } from './disc.js';
import { FrameBuffer } from './frame_buffer.js';
import { Team, NUM_PLAYERS } from './team.js';
import { ARM_HEIGHT } from './player.js';
import { ToastService } from './toast_service.js';
import { ClosestPickupStrategy } from './strategy/closest_pickup.js';
import { IdleStrategy } from './strategy/idle.js';
import { KickoffStrategy } from './strategy/kickoff.js';
import { LineupStrategy } from './strategy/lineup.js';
import { ManToManDefenseStrategy } from './strategy/man_defense.js';
import { RandomOffenseStrategy } from './strategy/random_offense.js';
import { ManualOffenseStrategy } from './strategy/manual_offense.js';

const FRAME_TIME = 30;

const SHIRT = [224, 80, 0, 255];
const PANTS = [72, 88, 0, 255];
const HAIR = [0, 0, 0, 255];
const SKIN = [255, 200, 184, 255];
const SOCKS = [255, 255, 255, 255];
const BG = [0, 0, 0, 0];
const EYES = [7, 11, 90, 255];

const WIN_SCORE = 11;

const FIELD_SPRITE_SIZE = [992, 408];

export const FIELD_BOUNDS = [[0, 110], [0, 40]]
export const FIELD_BOUNDS_NO_ENDZONES = [[20, 90], [0, 40]];

const WARNING_COLOR = '#fc8b28';

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

export const STATES = {
  Kickoff: 'kickoff', // Waiting for defense to pull
  Receiving: 'receiving', // Waiting for offense to receive pull
  Pickup: 'pickup', // Waiting for offense to pickup grounded disc
  Normal: 'normal', // Normal play; posession changes on grounded disc
  Reset: 'reset', // Waiting for players to return to the line after a score
  GameOver: 'gameover', // Game is over because one team has scored 11 points
};

// returns the create function for the chosen strategy
function pickStrategy(game, team) {
  switch (game.state) {
    case STATES.Kickoff:
      if (!team.onOffense) {
        if (team.hasDisc()) {
          return new KickoffStrategy(game, team);
        } else {
          if (game.defensiveTeam().hasDisc()) { console.log('The wrong team has the disc!'); return; }
          return new ClosestPickupStrategy(game, team);
        }
      } else {
        return new IdleStrategy(game, team);
      }
      break;
    case STATES.Receiving:
    case STATES.Pickup:
      if (team.onOffense) {
        return new ClosestPickupStrategy(game, team);
      } else {
        return new ManToManDefenseStrategy(game, team);
      }
    case STATES.Normal:
      if (game.disc.isLoose()) {
        if (team.onOffense) {
          return new ClosestPickupStrategy(game, team);
        } else {
          return new ManToManDefenseStrategy(game, team);
        }
      } else {
        if (team.onOffense) {
          return team == game.teams[0]
              ? new RandomOffenseStrategy(game, team)
              : new ManualOffenseStrategy(game, team);
        } else {
          return new ManToManDefenseStrategy(game, team);
        }
      }
    case STATES.Reset:
      return new LineupStrategy(game, team);
    case STATES.GameOver:
      // TODO: More fun behavior? High fives, celebrations?
      return new LineupStrategy(game, team);
  }
  throw new Error('Unexpected state: ' + game.state);
}

export class Game {
  constructor(resources, canvas) {
    this.canvas = canvas;
    this.resources = resources;
    this.setupCanvas();
    this.reset();
  }

  reset() {
    this.teams = [
        new Team(this, '#ff0000', RED_COLORS, 'W').addPlayers(false),
        new Team(this, '#0000ff', BLUE_COLORS, 'E').addPlayers(true).setOnOffense(true)];
    let player = this.teams[0].players[Math.trunc(Math.random() * NUM_PLAYERS)];
    this.disc = new Disc(this)
        .setPlayer(player)
        .setVelocity([0, 0, 0])
        .setPosition(player.position.concat(ARM_HEIGHT));
    this.toastService = new ToastService();
    this.setState(STATES.Kickoff);
  }

  start() {
    if (this.isRunning()) { throw new Error('Game is already running!'); }
    this.tickCallback = window.setTimeout(this.tick.bind(this), FRAME_TIME);
  }

  stop() {
    if (!this.isRunning()) { throw new Error('Game is not running!'); }
    window.clearTimeout(this.tickCallback);
    this.tickCallback = null;
  }

  isRunning() {
    return !!this.tickCallback;
  }

  tick() {
    const context = canvas.getContext('2d');
    this.update();
    this.draw(context);
    this.tickCallback = window.setTimeout(this.tick.bind(this), FRAME_TIME);
  }

  setupCanvas() {
    // Add some extra margin on the top and bottom of the screen so that we can
    // see out-of-bounds catches.
    const effectiveWidth = this.canvas.parentElement.clientWidth;
    const effectiveHeight = this.canvas.parentElement.clientHeight * 0.80;
    const topMargin = this.canvas.parentElement.clientHeight * 0.05;

    const wRatio = effectiveWidth / FIELD_SPRITE_SIZE[0];
    const hRatio = effectiveHeight / FIELD_SPRITE_SIZE[1];
    this.fieldScale = Math.min(wRatio, hRatio);
    this.fieldOffset = wRatio < hRatio
        ? [0, (effectiveHeight - FIELD_SPRITE_SIZE[1] * this.fieldScale) / 2 + topMargin]
        : [(effectiveWidth - FIELD_SPRITE_SIZE[0] * this.fieldScale) / 2, topMargin];
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
    const context = this.canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.translate(this.fieldOffset[0], this.fieldOffset[1]);
    context.scale(this.fieldScale, this.fieldScale);
    context.save();

    // DEBUG: console.log('Field scale ' + this.fieldScale + ' offset ' + this.fieldOffset);
    // DEBUG: console.log('Canvas size: ' + canvas.width + ', ' + canvas.height);

    window.onresize = () => this.setupCanvas();
  }

  draw(context) {
    const frameBuffer = new FrameBuffer();
    for (let team of this.teams) {
      team.draw(frameBuffer);
    }
    this.disc.draw(frameBuffer);
    this.toastService.draw(frameBuffer);

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#50a003';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    context.drawImage(this.resources.fieldSprite, 0, 0);
    frameBuffer.drawScene(context);
  }

  update() {
    // Each team executes its strategy
    for (let team of this.teams) {
      // Pick a strategy if we don't have one active
      if (!team.strategy) {
        team.strategy = pickStrategy(this, team);
        // DEBUG: console.log('New strategy (team ' + team.id + '): ' + team.strategy.constructor.name);
      }
      if (team.strategy) {
        if (team.strategy.update()) {
          // Strategy returns truthy if it should be expired
          team.strategy = null;
        }
      } else {
        throw new Error('Failed to pick a strategy.');
      }
    }
    // Players and physics update
    for (let team of this.teams) {
      for (let player of team.players) {
        player.update();
      }
    }
    this.disc.update();
    this.toastService.update();
    // Special transition if we are waiting for reset
    if (this.state === STATES.Reset) {
      let ready = true;
      for (let team of this.teams) {
        let homeEndzone = Game.endzone(team.goalDirection === 'W' ? 'E' : 'W');
        for (let player of team.players) {
          if (!Game.boundsCheck(player.position, homeEndzone)) {
            ready = false;
          }
        }
      }
      if (ready) {
        this.setState(STATES.Kickoff);
      }
    } else if (this.state === STATES.Pickup) {
      // Special transition if we are waiting for a player to inbound the disc
      let playerWithDisc = this.playerWithDisc();
      if (playerWithDisc && Game.boundsCheck(playerWithDisc.position, FIELD_BOUNDS_NO_ENDZONES)) {
        this.setState(STATES.Normal);
      }
    } else if (this.state === STATES.Normal) {
      // Special transition if a player steps out of bounds
      let playerWithDisc = this.playerWithDisc();
      if(playerWithDisc && !Game.boundsCheck(playerWithDisc.position, FIELD_BOUNDS_NO_ENDZONES)) {
        this.setState(STATES.Pickup);
      }
    }
  }

  setState(state) {
    // DEBUG: if (this.state !== state) { console.log('New state: ' + state); }
    this.state = state;
    for (let team of this.teams) {
      team.strategy = null;
    }
  }

  offensiveTeam() { return this.teams.find(t => t.onOffense); }

  defensiveTeam() { return this.teams.find(t => !t.onOffense); }

  allPlayers() { return this.teams[0].players.concat(this.teams[1].players); }

  swapSides() {
    const temp = this.teams[0].goalDirection;
    this.teams[0].goalDirection = this.teams[1].goalDirection;
    this.teams[1].goalDirection = temp;
  }

  playerWithDisc() {
    switch (this.state) {
      case STATES.Kickoff:
      case STATES.Reset:
        return this.defensiveTeam().players.find(p => p.hasDisc);
      case STATES.Pickup:
      case STATES.Normal:
        return this.offensiveTeam().players.find(p => p.hasDisc);
      default:
        return null;
    }
  }

  setOffensiveTeam(team) {
    for (let t of this.teams) { t.onOffense = false; }
    team.onOffense = true;
  }

  discThrownBy(player) {
    // DEBUG: console.log('discThrown by player ' + player.id);
    this.lastThrower = player;
    if (this.state === STATES.Kickoff) {
      this.setState(STATES.Receiving);
    }
  }

  discGrounded() {
    // DEBUG: console.log('discGrounded');
    if (this.state === STATES.Receiving) {
      this.setState(STATES.Pickup);
      return;
    } else if (this.state === STATES.Pickup) {
      return;
    } else if (this.state !== STATES.Normal) {
      throw new Error('Disc grounded in unexpected state: ' + this.state);
    }

    this.setOffensiveTeam(this.defensiveTeam());
    this.setState(STATES.Pickup);
    this.toastService.addToast(
        'Turnover!',
        this.disc.position,
        [0, 0, 0.1],
        WARNING_COLOR,
        100);
  }

  discDroppedBy(player) {
    // DEBUG: console.log('discDropped by player ' + player.id);
  }

  discCaughtBy(player) {
    // DEBUG: console.log('discCaught by player ' + player.id);

    // Special case: receiving the pull
    if (this.state === STATES.Receiving) {
      if (player.team.onOffense) {
        this.setState(STATES.Normal);
      } else {
        console.log('Defensive player cannot intercept the pull!');
        player.drop();
        this.setState(STATES.Pickup);
      }
      return;
    } else if (this.state === STATES.Pickup) {
      return;
    } else if (this.state !== STATES.Normal) {
      throw new Error('Disc caught in unexpected state:' + this.state);
    }

    let interception = !player.team.onOffense;
    if (Game.isInBounds(player.position)) {
      if ((player.team.goalDirection === 'E' && player.position[0] > 90)
          || (player.team.goalDirection === 'W' && player.position[0] < 20)) {
        player.team.score++;
        this.toastService.addToast(
            (interception ? 'Callahan!!' : 'Score!') + ' '
                + this.offensiveTeam().score + ' vs ' + this.defensiveTeam().score,
            player.position.concat(5),
            [0, 0, 0.03],
            this.offensiveTeam().textColor,
            300);
        if (player.team.score >= WIN_SCORE) {
          this.setState(STATES.GameOver);
        } else {
          this.setState(STATES.Reset);
          this.setOffensiveTeam(this.defensiveTeam());
          this.swapSides();
        }
      } else if (interception) {
        this.toastService.addToast(
            'Interception!',
            player.position.concat(5),
            [0, 0, 0.1],
            player.team.textColor,
            100);
        this.setOffensiveTeam(player.team);
      }
    } else {
      this.toastService.addToast(
          'Out of bounds!',
          player.position.concat(5),
          [0, 0, 0.1],
          WARNING_COLOR,
          100);
      this.setState(STATES.Pickup);
      this.setOffensiveTeam(this.defensiveTeam());
      if (!player.team.onOffense) {
        player.drop();
      }
    }
  }

  discPickedUpBy(player) {
    // DEBUG: console.log('discPickedUp by player ' + player.id);
  }

  static endzone(goalDirection) {
    return goalDirection === 'E' ? [[90, 110], [0, 40]] : [[0, 20], [0, 40]];
  }

  static isInBounds(position) {
    return Game.boundsCheck(position, FIELD_BOUNDS);
  }

  static boundsCheck(position, bounds) {
    return bounds[0][0] <= position[0] && position[0] <= bounds[0][1]
        && bounds[1][0] <= position[1] && position[1] <= bounds[1][1];
  }

  static snapToBounds(position, bounds) {
    let result = position.slice(0, 2);
    if (result[0] < bounds[0][0]) { result[0] = bounds[0][0]; }
    if (result[0] > bounds[0][1]) { result[0] = bounds[0][1]; }
    if (result[1] < bounds[1][0]) { result[1] = bounds[1][0]; }
    if (result[1] > bounds[1][1]) { result[1] = bounds[1][1]; }
    return result;
  }

  // returns [player, distance]
  static getClosestPlayer(players, location) {
    let closestPlayer;
    let closestPlayerDistance;
    for (let player of players) {
      let dist = dist2d(player.position, location);
      if (!closestPlayer || dist < closestPlayerDistance) {
        closestPlayer = player;
        closestPlayerDistance = dist;
      }
    }
    return [closestPlayer, closestPlayerDistance];
  }

  // returns Promise<resources>
  static loadResources() {
    return Promise.all([
          loadImage('images/field.png'),
          loadImage('images/player_sprite_grid.png'),
        ]).then((results) => {
          let [fieldSprite, playerSpriteSet] = results;
          return splitSprite(playerSpriteSet, 16, 32).then((splitSprites) => {
            return mirrorImages(splitSprites).then((mirroredSprites) => {
              let playerSprites = [ ...splitSprites ].concat([ ...mirroredSprites ])
              console.log('After mirroring, loaded ' + playerSprites.length + ' sprites.');
              let runningSprites = {
                'E': playerSprites.slice(0, 3),
                'SE': playerSprites.slice(3, 6),
                'NE': playerSprites.slice(6, 9),
                'N': playerSprites.slice(9, 12),
                'S': playerSprites.slice(12, 15),
                'W': playerSprites.slice(21, 24),
                'SW': playerSprites.slice(24, 27),
                'NW': playerSprites.slice(27, 30),
              };
              let standingSprites = {
                'S': playerSprites[15],
                'SE': playerSprites[16],
                'NE': playerSprites[17],
                'N': playerSprites[18],
                'E': playerSprites[19],
                'SW': playerSprites[37],
                'NW': playerSprites[38],
                'W': playerSprites[40],
              };
              const resources = {fieldSprite, playerSprites, runningSprites, standingSprites};
              return resources;
            });
          });
        }, (error) => {
          console.log('Failed to initialize.');
          console.log(error);
        });
  }
}
