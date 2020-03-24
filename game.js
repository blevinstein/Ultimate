
import { Disc } from './disc.js';
import { Team } from './team.js';
import { ChargeStrategy } from './strategy/charge.js';
import { ClosestPickupStrategy } from './strategy/closest_pickup.js';
import { IdleStrategy } from './strategy/idle.js';
import { KickoffStrategy } from './strategy/kickoff.js';
import { RetreatStrategy } from './strategy/retreat.js';

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

const STATES = {
  Kickoff: 'kickoff', // Waiting for defense to pull
  Receiving: 'receiving', // Waiting for offense to receive pull
  Pickup: 'pickup', // Waiting for offense to pickup grounded disc
  Normal: 'normal', // Normal play; posession changes on grounded disc
  Reset: 'rest', // Waiting for players to return to the line after a score
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
      return ChargeStrategy.create(game, team);
      break;
    case STATES.Pickup:
      if (team.onOffense) {
        return ClosestPickupStrategy.create(game, team);
      } else {
        // TODO: Start defense
        return IdleStrategy.create(game, team);
      }
    case STATES.Normal:
      return IdleStrategy.create(game, team);
      break;
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
    this.disc = new Disc(this).setPlayer(this.teams[0].players[0]);
    this.state = STATES.Kickoff;
  }

  draw(context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(this.resources.fieldSprite, 0, 0);
    for (let team of this.teams) {
      team.draw(context);
    }
    this.disc.draw(context);
  }

  update() {
    for (let team of this.teams) {
      // Pick a strategy if we don't have one active
      if (!team.strategy) {
        team.strategy = pickStrategy(this, team);
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
    this.disc.update();
  }

  offensiveTeam() { return this.teams.find(t => t.onOffense); }

  defensiveTeam() { return this.teams.find(t => !t.onOffense); }

  setOffensiveTeam(team) {
    for (let t of this.teams) { t.onOffense = false; }
    team.onOffense = true;
  }

  discThrownBy(player) {
    console.log('discThrown');
    if (this.state === STATES.Kickoff) {
      this.state = STATES.Receiving;
    }
  }

  discGrounded() {
    console.log('discGrounded');
    if (this.state === STATES.Receiving) {
      this.state = STATES.Pickup;
    } else if (this.state === STATES.Normal) {
      this.setOffensiveTeam(this.defensiveTeam());
      this.state = STATES.Pickup;
    }
  }

  discCaughtBy(player) {
    console.log('discCaught');
    if (this.state === STATES.Receiving) {
      if (player.team.onOffense) {
        this.state = STATES.Normal;
      } else {
        // Defensive player cannot intercept the pull
        player.drop();
        this.state = STATES.Pickup;
      }
    }
  }

  discPickedUpBy(player) {
    console.log('discPickedUp');
    if (this.state === STATES.Pickup) {
      this.state = STATES.Normal;
      this.setOffensiveTeam(player.team);
    }
  }
}
