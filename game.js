
import { Disc } from './disc.js';
import { FrameBuffer } from './frame_buffer.js';
import { Team } from './team.js';
import { ChargeStrategy } from './strategy/charge.js';
import { ClosestPickupStrategy } from './strategy/closest_pickup.js';
import { IdleStrategy } from './strategy/idle.js';
import { KickoffStrategy } from './strategy/kickoff.js';
import { ManToManDefenseStrategy } from './strategy/man_defense.js';
import { RetreatStrategy } from './strategy/retreat.js';
import { RandomOffenseStrategy } from './strategy/random_offense.js';

const SHIRT = [224, 80, 0, 255];
const PANTS = [72, 88, 0, 255];
const HAIR = [0, 0, 0, 255];
const SKIN = [255, 200, 184, 255];
const SOCKS = [255, 255, 255, 255];
const BG = [0, 0, 0, 0];
const EYES = [7, 11, 90, 255];

const WIN_SCORE = 11;
export const FIELD_BOUNDS = [[0, 110], [0, 40]]
export const FIELD_BOUNDS_NO_ENDZONES = [[20, 90], [0, 40]];

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

const STATES = {
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
      if (team.onOffense === team.hasDisc()) { console.log('The wrong team has the disc!'); return; }
      if (!team.onOffense) {
        return KickoffStrategy.create(game, team);
      } else {
        return IdleStrategy.create(game, team);
      }
      break;
    case STATES.Receiving:
    case STATES.Pickup:
      if (team.onOffense) {
        return ClosestPickupStrategy.create(game, team);
      } else {
        return ManToManDefenseStrategy.create(game, team);
      }
    case STATES.Normal:
      if (game.disc.position) {
        if (team.onOffense) {
          return ClosestPickupStrategy.create(game, team);
        } else {
          return ManToManDefenseStrategy.create(game, team);
        }
      } else {
        if (team.onOffense) {
          return RandomOffenseStrategy.create(game, team);
        } else {
          return ManToManDefenseStrategy.create(game, team);
        }
      }
    case STATES.Reset:
      return RetreatStrategy.create(game, team);
    case STATES.GameOver:
      return RetreatStrategy.create(game, team);
  }
  console.log('Default idle in state ' + game.state);
  return IdleStrategy.create(game, team);
}

export class Game {
  constructor(resources) {
    this.resources = resources;
    this.teams = [
        new Team(this, RED_COLORS, 'W').addPlayers(false),
        new Team(this, BLUE_COLORS, 'E').addPlayers(true).setOnOffense(true)];
    this.disc = new Disc(this).setPlayer(this.teams[0].players[Math.trunc(Math.random() * 7)]);
    this.setState(STATES.Kickoff);
  }

  draw(context) {
    const frameBuffer = new FrameBuffer();
    for (let team of this.teams) {
      team.draw(frameBuffer);
    }
    this.disc.draw(frameBuffer);

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
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
        console.log('New strategy: ' + team.strategy.constructor.name);
      }
      if (team.strategy) {
        if (team.strategy.update()) {
          // Strategy returns truthy if it should be expired
          team.strategy = null;
        }
      } else {
        console.log('Failed to pick a strategy.');
      }
    }
    // Players and physics update
    for (let team of this.teams) {
      for (let player of team.players) {
        player.update();
      }
    }
    this.disc.update();
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
    }
  }

  setState(state) {
    this.state = state;
    for (let team of this.teams) {
      team.strategy = null;
    }
  }

  offensiveTeam() { return this.teams.find(t => t.onOffense); }

  defensiveTeam() { return this.teams.find(t => !t.onOffense); }

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
    console.log('discThrown');
    this.lastThrower = player;
    if (this.state === STATES.Kickoff) {
      this.setState(STATES.Receiving);
    }
  }

  discGrounded() {
    console.log('discGrounded');
    this.lastThrower = null;
    if (this.state === STATES.Receiving) {
      this.setState(STATES.Pickup);
    } else if (this.state === STATES.Normal) {
      this.setOffensiveTeam(this.defensiveTeam());
      this.setState(STATES.Pickup);
    }
  }

  discCaughtBy(player) {
    console.log('discCaught');
    this.lastThrower = null;
    if (this.state === STATES.Receiving) {
      if (player.team.onOffense) {
        this.setState(STATES.Normal);
      } else {
        // Defensive player cannot intercept the pull
        player.drop();
        this.setState(STATES.Pickup);
      }
    } else {
      console.log('Interception!');
      if (!player.team.onOffense) {
        this.setOffensiveTeam(player.team);
      }
    }

    if (Game.isInBounds(player.position)) {
      if ((player.team.goalDirection === 'E' && player.position[0] > 90)
          || (player.team.goalDirection === 'W' && player.position[0] < 20)) {
        player.team.score++;
        console.log('Score is: ' + this.teams[0].score + ' vs ' + this.teams[1].score);
        if (player.team.score > WIN_SCORE) {
          this.setState(STATES.GameOver);
        } else {
          this.setState(STATES.Reset);
          this.setOffensiveTeam(this.defensiveTeam());
          this.swapSides();
        }
      }
    } else {
      // Player is not in bounds; disc is surrendered to the other team
      player.drop()
      this.setState(STATES.Pickup)
    }
  }

  discPickedUpBy(player) {
    console.log('discPickedUp');
    if (this.state === STATES.Pickup) {
      this.setState(STATES.Normal);
      this.setOffensiveTeam(player.team);
    }
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
}
