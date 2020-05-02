const {
    Coach
} = require('./coach.js');
const {
    Disc
} = require('./disc.js');
const {
    FrameBuffer
} = require('./frame_buffer.js');
const {
    loadImage,
    mirrorImages,
    splitSprite
} = require('./image_utils.js');
const {
    dist2d,
    mag2d,
    mul2d,
    norm2d,
    sub2d
} = require('./math_utils.js');
const {
    ARM_HEIGHT
} = require('./player_params.js');
const {
    NUM_PLAYERS,
    Team
} = require('./team.js');
const {
    ToastService
} = require('./toast_service.js');
const {
    STATES,
    FIELD_BOUNDS,
    FIELD_BOUNDS_NO_ENDZONES
} =
require('./game_params.js');
const {
    boundsCheck
} = require('./game_utils.js');

const SHIRT = [224, 80, 0, 255];
const PANTS = [72, 88, 0, 255];
const HAIR = [0, 0, 0, 255];
const SKIN = [255, 200, 184, 255];
const SOCKS = [255, 255, 255, 255];
const BG = [0, 0, 0, 0];
const EYES = [7, 11, 90, 255];

module.exports = {
    SHIRT,
    PANTS,
    HAIR,
    SKIN,
    SOCKS,
    BG,
    EYES,
};

// Milliseconds to wait between frames at normal speed
const FRAME_TIME_MS = 30;
// Milliseconds to wait between frames when in fast forwardg
const FAST_FORWARD_MS = 5;
// Milliseconds to wait between frames when in slow motion
const SLOW_MOTION_MS = 300;

// Seconds to wait before fast-forwarding when in reset state
const RESET_FF_DELAY = 1.0;

const WIN_SCORE = 11;

const FIELD_SPRITE_SIZE = [992, 408];

const COLLISION_DIST = 1.5;
const MAX_COLLISION_IMPULSE = 1.0;

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

module.exports.Game = class Game {
    constructor(resources, canvas, coaches = [new Coach(), new Coach()]) {
        this.canvas = canvas;
        this.resources = resources;
        this.coaches = coaches;
        if (canvas) {
            this.setupCanvas();
        }
        this.reset();
    }

    reset() {
        this.teams = [
            new Team(this, this.coaches[0], '#ff0000', RED_COLORS, 'W')
            .addPlayers(false),
            new Team(this, this.coaches[1], '#0000ff', BLUE_COLORS, 'E')
            .addPlayers(true)
        ];
        // Random team is assigned to offense
        let offensiveTeamIndex = Math.trunc(Math.random() * 2);
        this.teams[offensiveTeamIndex].setOnOffense(true);
        // Random player is assigned to pull
        let player =
            this.defensiveTeam().players[Math.trunc(Math.random() * NUM_PLAYERS)];
        this.disc = new Disc(this)
            .setPlayer(player)
            .setVelocity([0, 0, 0])
            .setPosition(player.position.concat(ARM_HEIGHT));
        this.toastService = new ToastService();
        this.setState(STATES.Kickoff);
    }

    start() {
        if (this.isRunning()) {
            throw new Error('Game is already running!');
        }
        this.frameTime = this.frameTime || FRAME_TIME_MS;
        this.tickCallback = window.setTimeout(this.tick.bind(this), this.frameTime);
    }

    stop() {
        if (!this.isRunning()) {
            throw new Error('Game is not running!');
        }
        window.clearTimeout(this.tickCallback);
        this.tickCallback = null;
    }

    isRunning() {
        return !!this.tickCallback;
    }

    tick() {
        const tickStartTime = new Date().getTime();
        const context = canvas.getContext('2d');
        this.update();
        this.draw(context);
        const tickDuration = new Date().getTime() - tickStartTime;
        const desiredTickInterval = this.state === STATES.Reset && RESET_FF_DELAY &&
            this.stateTime > RESET_FF_DELAY ?
            FAST_FORWARD_MS :
            this.frameTime;
        if (tickDuration > desiredTickInterval) {
            console.log('Tick was too slow for desiredTickInterval: ' + tickDuration +
                ' > ' + desiredTickInterval);
        }
        const waitDuration = Math.max(desiredTickInterval - tickDuration, 0);
        this.tickCallback = window.setTimeout(this.tick.bind(this), waitDuration);
    }

    setupCanvas() {
        // Add some extra margin on the top and bottom of the screen so that we can
        // see out-of-bounds catches.
        const effectiveWidth = this.canvas.parentElement.clientWidth;
        const effectiveHeight = this.canvas.parentElement.clientHeight * 0.9;
        const topMargin = this.canvas.parentElement.clientHeight * 0.0;

        const wRatio = effectiveWidth / FIELD_SPRITE_SIZE[0];
        const hRatio = effectiveHeight / FIELD_SPRITE_SIZE[1];
        this.fieldScale = Math.min(wRatio, hRatio);
        this.fieldOffset = wRatio < hRatio ? [0, (effectiveHeight - FIELD_SPRITE_SIZE[1] * this.fieldScale) / 2 + topMargin] : [(effectiveWidth - FIELD_SPRITE_SIZE[0] * this.fieldScale) / 2, topMargin];
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        const context = this.canvas.getContext('2d');
        context.imageSmoothingEnabled = false;
        context.translate(this.fieldOffset[0], this.fieldOffset[1]);
        context.scale(this.fieldScale, this.fieldScale);
        context.save();

        // DEBUG: console.log('Field scale ' + this.fieldScale + ' offset ' +
        // this.fieldOffset); DEBUG: console.log('Canvas size: ' + canvas.width + ',
        // ' + canvas.height);

        window.onresize = () => this.setupCanvas();

        window.onkeypress = (event) => {
            if (event.key.toUpperCase() === 'R') {
                this.reset();
                if (!this.isRunning()) {
                    this.start();
                }
            } else if (event.key.toUpperCase() === 'Q') {
                if (this.isRunning()) {
                    this.stop();
                }
            } else if (event.key.toUpperCase() === 'W') {
                if (!this.isRunning()) {
                    this.start();
                }
            } else if (event.key.toUpperCase() === 'S') {
                this.frameTime =
                    this.frameTime === SLOW_MOTION_MS ? FRAME_TIME_MS : SLOW_MOTION_MS;
            } else if (event.key.toUpperCase() === 'F') {
                this.frameTime = this.frameTime === FAST_FORWARD_MS ? FRAME_TIME_MS :
                    FAST_FORWARD_MS;
            }
        };
    }

    draw(context) {
        const frameBuffer = new FrameBuffer();
        for (let team of this.teams) {
            team.draw(frameBuffer);
        }
        // TODO: Move this into update() instead of draw()
        if (this.state === STATES.Normal && !this.disc.isLoose() &&
            this.stallCount >= 1) {
            // TODO: Position the stall count over the defender, not the thrower.
            this.toastService.addToast(
                '' + Math.trunc(this.stallCount),
                this.playerWithDisc().position.concat(3),
                [0, 0, 0],
                this.stallCount < 4 ? '#00ff00' :
                (this.stallCount < 7 ? 'yellow' : 'red'),
                1,
                this.stallCount < 7 ? '#000000' : 'white',
            );
        }
        this.disc.draw(frameBuffer);
        this.toastService.draw(frameBuffer);

        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.fillStyle = '#50a003';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();
        context.drawImage(this.resources.fieldSprite, 0, 0);
        for (let team of this.teams) {
            if (team.strategy) {
                team.strategy.draw(context);
            }
        }
        frameBuffer.drawScene(context);
    }

    update() {
        this.stateTime += FRAME_TIME_MS / 1000.0;
        // Each team executes its strategy
        for (let team of this.teams) {
            // Pick a strategy if we don't have one active
            if (!team.strategy) {
                team.strategy = team.coach.pickStrategy(this, team);
                // DEBUG: console.log('New strategy (team ' + team.id + '): ' +
                // team.strategy.constructor.name);
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
        // Collisions between players. Using a sliding window based on x
        // coordinates, find all pairs of players that are too close.
        let allPlayers =
            this.allPlayers().sort((a, b) => a.position[0] - b.position[0]);
        let windowMin = 0;
        let windowMax = 0;
        for (let i = 0; i < allPlayers.length; i++) {
            // Update window.
            // windowMin = first player within collisionDist by x coord.
            while (allPlayers[windowMin].position[0] <
                allPlayers[i].position[0] - COLLISION_DIST) {
                windowMin++;
            }
            // windowMax = first player not within collisionDist by x coord.
            while (windowMax < allPlayers.length &&
                allPlayers[windowMax].position[0] <
                allPlayers[i].position[0] + COLLISION_DIST) {
                windowMax++;
            }
            for (let j = windowMin; j < windowMax; j++) {
                if (i <= j)
                    continue;
                let distance = dist2d(allPlayers[i].position, allPlayers[j].position);
                if (distance < COLLISION_DIST) {
                    const collisionImpulse = Math.pow(1 - distance / COLLISION_DIST, 4) *
                        MAX_COLLISION_IMPULSE;
                    const collisionDirection =
                        norm2d(sub2d(allPlayers[i].position, allPlayers[j].position));
                    if (allPlayers[i].moving) {
                        allPlayers[i].accelerate(
                            mul2d(collisionDirection, collisionImpulse));
                    }
                    if (allPlayers[j].moving) {
                        allPlayers[j].accelerate(
                            mul2d(collisionDirection, -collisionImpulse));
                    }
                }
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

        // Special transitions if we are waiting for a condition to be satisfied
        if (this.state === STATES.Reset) {
            // Waiting for players to return to their endzone
            let ready = true;
            for (let team of this.teams) {
                let homeEndzone = Game.endzone(team.goalDirection === 'W' ? 'E' : 'W');
                for (let player of team.players) {
                    if (!boundsCheck(player.position, homeEndzone)) {
                        ready = false;
                    }
                }
            }
            if (ready) {
                this.setState(STATES.Kickoff);
            }
        } else if (this.state === STATES.Pickup) {
            // Waiting for a player to bring the disc back in bounds
            let playerWithDisc = this.playerWithDisc();
            if (playerWithDisc &&
                boundsCheck(playerWithDisc.position, FIELD_BOUNDS_NO_ENDZONES)) {
                this.setState(STATES.Normal);
                this.toastService.addToast('Disc in!',
                    playerWithDisc.position.concat(5),
                    [0, 0, 0.1], '#00ff00', 100, 'black');
            }
        } else if (this.state === STATES.Normal) {
            // Waiting for a player to step out of bounds
            let playerWithDisc = this.playerWithDisc();
            if (playerWithDisc && !boundsCheck(playerWithDisc.position,
                    FIELD_BOUNDS_NO_ENDZONES)) {
                // A player who steps out of bounds (or in the endzone) after catching
                // in-bounds must return the disc to the legal zone.
                this.setState(STATES.Pickup);
            }
            // Waiting for stall count to hit ten
            if (playerWithDisc) {
                // TODO: Only increment stallCount when a defender is in stall range
                this.stallCount += FRAME_TIME_MS / 1000;
                if (this.stallCount >= 10) {
                    playerWithDisc.drop();
                    this.setOffensiveTeam(this.defensiveTeam());
                    this.setState(STATES.Pickup);
                    this.toastService.addToast('Stall!', this.disc.position,
                        [0, 0, 0.1],
                        this.offensiveTeam().textColor, 100);
                }
            }
        }
    }

    setState(state) {
        // DEBUG: if (this.state !== state) { console.log('New state: ' + state); }
        this.state = state;
        this.stateTime = 0;
        for (let team of this.teams) {
            team.strategy = null;
        }
        this.stallCount = 0;
    }

    offensiveTeam() {
        return this.teams.find(t => t.onOffense);
    }

    defensiveTeam() {
        return this.teams.find(t => !t.onOffense);
    }

    allPlayers() {
        return this.teams[0].players.concat(this.teams[1].players);
    }

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
        for (let t of this.teams) {
            t.onOffense = false;
        }
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
        this.toastService.addToast('Turnover!', this.disc.position, [0, 0, 0.1],
            WARNING_COLOR, 100);
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

        this.stallCount = 0;
        let interception = !player.team.onOffense;
        if (boundsCheck(player.position, FIELD_BOUNDS)) {
            if ((player.team.goalDirection === 'E' && player.position[0] > 90) ||
                (player.team.goalDirection === 'W' && player.position[0] < 20)) {
                player.team.score++;
                this.toastService.addToast((interception ? 'Callahan!!' : 'Score!') +
                    ' ' + this.offensiveTeam().score +
                    ' vs ' + this.defensiveTeam().score,
                    player.position.concat(5), [0, 0, 0.03],
                    this.offensiveTeam().textColor, 300);
                if (player.team.score >= WIN_SCORE) {
                    this.setState(STATES.GameOver);
                } else {
                    this.setState(STATES.Reset);
                    this.setOffensiveTeam(this.defensiveTeam());
                    this.swapSides();
                }
            } else if (interception) {
                this.toastService.addToast('Interception!', player.position.concat(5),
                    [0, 0, 0.1], player.team.textColor, 100);
                this.setOffensiveTeam(player.team);
            }
        } else {
            this.toastService.addToast('Out of bounds!', player.position.concat(5),
                [0, 0, 0.1], WARNING_COLOR, 100);
            this.setState(STATES.Pickup);
            this.setOffensiveTeam(this.defensiveTeam());
            if (!player.team.onOffense) {
                player.drop();
            }
        }
    }

    discPickedUpBy(player) {
        // DEBUG: console.log('discPickedUp by player ' + player.id);
        this.stallCount = 0;
    }

    static endzone(goalDirection) {
        return goalDirection === 'E' ? [
            [90, 110],
            [0, 40]
        ] : [
            [0, 20],
            [0, 40]
        ];
    }

    // returns Promise<resources>
    static loadResources() {
        return Promise
            .all([
                loadImage('images/field.png'),
                loadImage('images/player_sprite_grid.png'),
            ])
            .then(
                (results) => {
                    let [fieldSprite, playerSpriteSet] = results;
                    return splitSprite(playerSpriteSet, 16, 32)
                        .then((splitSprites) => {
                            return mirrorImages(splitSprites)
                                .then((mirroredSprites) => {
                                    let playerSprites = [...splitSprites].concat([...mirroredSprites])
                                    console.log('After mirroring, loaded ' +
                                        playerSprites.length + ' sprites.');
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
                                    const resources = {
                                        fieldSprite,
                                        playerSprites,
                                        runningSprites,
                                        standingSprites
                                    };
                                    return resources;
                                });
                        });
                },
                (error) => {
                    console.log('Failed to initialize.');
                    console.log(error);
                });
    }
}