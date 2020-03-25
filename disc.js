
import { add3d, dist2d, dist3d, mul3d, sub3d, linearInterpolate, project2d, project3d } from './math_utils.js';

const GROUND_FRICTION = 0.2;
const AIR_FRICTION = 0.01;
const PLAYER_HEIGHT = 4;

const MAX_CATCH_DIST = 1;
const MAX_PICKUP_DIST = 1;

export class Disc {
  constructor(game, initialPlayer, initialPosition) {
    this.game = game;
    this.sprite = game.resources.discSprite;
    this.shadowSprite = game.resources.discShadowSprite;
    this.velocity = [0, 0, 0];
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

  updatePhysics() {
    // Momentum
    this.position = add3d(this.position, this.velocity);

    // Gravity
    this.velocity = add3d(this.velocity, [0, 0, -0.1]);

    // Ground contact
    if (this.position[2] <= 0) {
      this.position = this.position.slice(0, 2).concat(0);
      this.velocity = this.velocity.slice(0, 2).concat(0);
      this.grounded = true;
      this.velocity = mul3d(this.velocity, 1 - GROUND_FRICTION);
    } else {
      // TODO: Add lift
      this.velocity = mul3d(this.velocity, 1 - AIR_FRICTION);
    }
  }

  // Update disc, including catch/pickup and grounding events.
  update() {
    if (this.position) {
      const wasGrounded = this.grounded;

      this.updatePhysics();

      if (this.grounded) {
        if (!wasGrounded) { this.game.discGrounded(); }
        let pickupCandidate;
        let pickupDist;
        for (let player of this.game.offensiveTeam().players) {
          let d = dist2d(player.position, this.position);
          if (d < (pickupDist || MAX_PICKUP_DIST)) {
            pickupCandidate = player;
            pickupDist = d;
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
          this.setPlayer(catchCandidate);
          this.game.discCaughtBy(catchCandidate);
        }
      }
    }
  }

  // returns [groundedPosition, groundedTime]
  static simulateUntilGrounded(game, initialPosition, initialVelocity) {
    let disc = new Disc(game, null, initialPosition).setVelocity(initialVelocity);
    let time = 0;
    while (!disc.grounded) {
      time++;
      disc.updatePhysics();
    }
    return [disc.position, time]
  }
}
