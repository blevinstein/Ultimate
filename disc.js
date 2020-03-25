
import { dist2d, dist3d, linearInterpolate, project2d, project3d } from './math_utils.js';

const GROUND_FRICTION = 0.8;
const AIR_FRICTION = 0.99;
const PLAYER_HEIGHT = 2;

const MAX_CATCH_DIST = 1;
const MAX_PICKUP_DIST = 1;

export class Disc {
  constructor(game, initialPlayer, initialPosition) {
    this.game = game;
    this.sprite = game.resources.discSprite;
    this.shadowSprite = game.resources.discShadowSprite;
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
    this.grounded = this.position[2] <= 0;
    return this;
  }

  setPlayer(player) {
    if (this.player) { this.player.setHasDisc(false); }
    this.player = player;
    this.player.setHasDisc(true);
    this.position = null;
    this.grounded = false;
    return this;
  }

  setVelocity(velocity) {
    this.velocity = velocity;
    return this;
  }

  draw(frameBuffer) {
    if (this.position) {
      const screenPosition = project3d(this.position);
      const shadowPosition = project2d(this.position);
      frameBuffer.drawImage(
          this.shadowSprite,
          shadowPosition[0] - this.shadowSprite.width / 2,
          shadowPosition[1] - this.shadowSprite.height / 2,
          this.position[1]);
      frameBuffer.drawImage(
          this.sprite,
          screenPosition[0] - this.sprite.width / 2,
          screenPosition[1] - this.sprite.height / 2,
          this.position[1]);
    }
    // TODO: Draw near player? Highlight player?
  }

  // Update disc, including catch/pickup and grounding events.
  update() {
    if (this.position) {
      const wasGrounded = this.grounded;

      // Momentum
      for (let i of [0, 1, 2]) {
        this.position[i] += this.velocity[i] || 0;
      }

      // Gravity
      this.velocity[2] -= 9.8 / 5;

      // Ground contact
      if (this.position[2] <= 0) {
        this.position[2] = 0;
        this.velocity[2] = 0;
        this.grounded = true;
        if (!wasGrounded) { this.game.discGrounded(); }
        for (let i of [0, 1]) { this.velocity[i] *= GROUND_FRICTION; }
      } else {
        // TODO: Add lift
        for (let i of [0, 1, 2]) { this.velocity[i] *= AIR_FRICTION; }
      }

      if (this.grounded) {
        let pickupCandidate;
        let pickupDist;
        for (let team of this.game.teams) {
          for (let player of team.players) {
            let d = dist2d(player.position, this.position);
            if (d < (pickupDist || MAX_PICKUP_DIST)) {
              pickupCandidate = player;
              pickupDist = d;
            }
          }
        }
        if (pickupCandidate) {
          this.setPlayer(pickupCandidate);
          this.game.discPickedUpBy(pickupCandidate);
        }
      } else {
        let catchCandidate;
        let catchDist;
        for (let team of this.game.teams) {
          for (let player of team.players) {
            let d = dist3d(player.position.concat(PLAYER_HEIGHT), this.position);
            if (d < (catchDist || MAX_PICKUP_DIST)) {
              catchCandidate = player;
              catchDist = d;
            }
          }
        }
        if (catchCandidate) {
          this.setPlayer(pickupCandidate);
          this.game.discCaughtBy(pickupCandidate);
        }
      }
    }
  }
}
