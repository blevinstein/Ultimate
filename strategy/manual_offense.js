
import { Cutter } from './cutter.js';
import { dist2d, mag2d, sub2d, getVector, magnitudeAlong2d, inverseProject2d } from '../math_utils.js';
import { Disc } from '../disc.js';
import { Game } from '../game.js';
import { Player, ARM_HEIGHT, MAX_THROW_SPEED } from '../player.js';
import { RangeFinderFactory } from '../range_finder.js';
import { Strategy } from './strategy.js';

const GOAL_RADIUS = 2;

const MAX_HANDLE_OFFSET = 0.1;


// Totally uncoordinated scramble. Players look for open areas of the field,
// from 10m behind the handler to back of the endzone. Handler throws when and
// where the user clicks.
export class ManualOffenseStrategy extends Strategy {
  constructor(game, team) {
    super(game, team);
    this.destinationMap = new Map;
    this.rangeFinder = RangeFinderFactory.create(MAX_THROW_SPEED);
    this.throwConfirmed = false;
    this.throwTarget = null;
    game.canvas.onclick = event => {
      this.throwConfirmed = true;
    };
    game.canvas.onmousemove = event => {
      this.throwTarget = inverseProject2d(mul2d(
          sub2d([event.offsetX, event.offsetY], game.fieldOffset), 1 / game.fieldScale));
    };
  }

  update() {
    if (!this.team.onOffense || this.game.disc.isLoose()) { return true; }

    for (let player of this.team.players) {
      if (player.hasDisc) {
        // Thrower behavior
        if (!this.throwTarget
            || dist3d(this.game.disc.position, player.desiredHandlePosition()) > MAX_HANDLE_OFFSET) {
          player.rest(getVector(this.team.goalDirection));
          continue;
        }

        let [closestReceiver, closestReceiverDistance] =
            Game.getClosestPlayer(this.team.players.filter(p => p != player), this.throwTarget);
        let runtime = Player.simulateRunTime(
            sub2d(this.throwTarget, closestReceiver.position),
            closestReceiver.velocity);
        let throwParams = this.rangeFinder.getThrowParams(
            sub2d(this.throwTarget, player.position), runtime);
        if (!throwParams) {
          console.log('Fallback to any throw');
          throwParams = this.rangeFinder.getThrowParams(
              sub2d(this.throwTarget, player.position));
        }
        if (!throwParams) {
          console.log('Fallback to longest throw');
          throwParams = this.rangeFinder.getLongestThrowParams(
              sub2d(this.throwTarget, player.position));
        }
        if (!throwParams) { throw new Error('Failed to get throw params!'); }
        let path = Disc.simulateUntilGrounded(
            this.game.disc.position,
            throwParams[0],
            Disc.createUpVector(...throwParams),
            true)[2];
        this.drawPath(path);
        if (this.throwConfirmed) {
          player.throw(...throwParams);
        } else {
          player.rest(getVector(this.team.goalDirection));
        }
      } else {
        // Cutter behavior
        let destination = this.destinationMap.get(player)
            || Cutter.chooseBestRandomDestination(this.game, this.team);
        if (!destination) { continue; }
        this.moveWithin(player, destination, GOAL_RADIUS);
        this.destinationMap.set(player, destination);
      }
    }
  }
}
