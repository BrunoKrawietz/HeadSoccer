class GameObject {
    constructor(x = 0, y = 0, z = 0) {
        this.position = { x, y, z };
        this.scale = { x: 1, y: 1, z: 1 };
        this.rotation = { x: 0, y: 0, z: 0 };
        this.active = true;
    }

    getModelMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, [this.position.x, this.position.y, this.position.z]);
        mat4.rotateX(matrix, matrix, this.rotation.x);
        mat4.rotateY(matrix, matrix, this.rotation.y);
        mat4.rotateZ(matrix, matrix, this.rotation.z);
        mat4.scale(matrix, matrix, [this.scale.x, this.scale.y, this.scale.z]);
        return matrix;
    }
}

class SoccerBall extends GameObject {
    constructor() {
        super(0, 0, 1.85);
        this.radius = 0.22;
        this.velocity = { x: 0, z: 0 };
        this.rotationAmount = 0;
        this.scale = { x: this.radius * 2, y: this.radius * 2, z: this.radius * 2 };
    }

    reset(direction = 1) {
        this.position.x = 0;
        this.position.y = 0;
        this.position.z = 1.85;
        this.velocity.x = 1.2 * direction;
        this.velocity.z = 0.25;
        this.rotationAmount = 0;
    }

    update(deltaTime, difficulty) {
        const gravity = -7.8;
        this.velocity.z += gravity * deltaTime;
        this.position.x += this.velocity.x * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        this.rotationAmount += (this.velocity.x / Math.max(this.radius, 0.001)) * deltaTime;

        const ground = this.radius;
        if (this.position.z < ground) {
            this.position.z = ground;
            if (Math.abs(this.velocity.z) > 0.35) this.velocity.z *= -0.76;
            else this.velocity.z = 0;
            this.velocity.x *= 0.992;
        }

        const maxSpeed = difficulty.ballMaxSpeed;
        const speed = Math.hypot(this.velocity.x, this.velocity.z);
        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            this.velocity.x *= scale;
            this.velocity.z *= scale;
        }
    }

    getModelMatrix() {
        const matrix = mat4.create();
        mat4.translate(matrix, matrix, [this.position.x, this.position.y, this.position.z]);
        mat4.rotateY(matrix, matrix, this.rotationAmount);
        mat4.scale(matrix, matrix, [this.radius * 2, this.radius * 2, this.radius * 2]);
        return matrix;
    }
}

class HeadSoccerPlayer extends GameObject {
    constructor(x, team) {
        super(x, 0, 0);
        this.team = team;
        this.direction = team === 1 ? 1 : -1;
        this.velocity = { x: 0, z: 0 };
        this.speed = 3.5;
        this.jumpVelocity = 5.5;
        this.onGround = true;
        this.walkPhase = 0;
        this.kickTimer = 0;
        this.bigHeadTimer = 0;
        this.superShotTimer = 0;
        this.bigGoalTimer = 0;
        this.bodyWidth = 0.3;
        this.bodyHeight = 0.4;
        this.baseHeadRadius = 0.34;
    }

    get headRadius() {
        return this.bigHeadTimer > 0 ? this.baseHeadRadius * 1.32 : this.baseHeadRadius;
    }

    get headCenter() {
        return {
            x: this.position.x,
            y: 0,
            z: this.position.z + 1.12
        };
    }

    get bodyCenter() {
        return {
            x: this.position.x,
            y: 0,
            z: this.position.z + 0.58
        };
    }

    update(deltaTime, controls, difficulty, arena) {
        let input = 0;
        if (controls.left) input -= 1;
        if (controls.right) input += 1;

        this.velocity.x = input * this.speed * difficulty.playerSpeedMultiplier;
        this.position.x += this.velocity.x * deltaTime;
        this.position.x = Math.max(arena.left + 0.45, Math.min(arena.right - 0.45, this.position.x));
        if (input !== 0) this.direction = input > 0 ? 1 : -1;

        if (controls.jump && this.onGround) {
            this.velocity.z = this.jumpVelocity;
            this.onGround = false;
        }

        this.velocity.z += -9.4 * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        if (this.position.z <= 0) {
            this.position.z = 0;
            this.velocity.z = 0;
            this.onGround = true;
        }

        if (controls.kickPressed) this.kickTimer = 0.22;
        this.kickTimer = Math.max(0, this.kickTimer - deltaTime);
        this.bigHeadTimer = Math.max(0, this.bigHeadTimer - deltaTime);
        this.superShotTimer = Math.max(0, this.superShotTimer - deltaTime);
        this.bigGoalTimer = Math.max(0, this.bigGoalTimer - deltaTime);

        if (Math.abs(input) > 0.01 && this.onGround) this.walkPhase += deltaTime * 13.0;
        else this.walkPhase += deltaTime * 2.0;
    }

    activatePowerUp(type) {
        if (type === 'BIG_HEAD') this.bigHeadTimer = 8.0;
        if (type === 'SUPER_SHOT') this.superShotTimer = 8.0;
        if (type === 'BIG_GOAL') this.bigGoalTimer = 8.0;
    }
}

class PowerUp extends GameObject {
    constructor(x, z) {
        super(x, 0, z);
        this.radius = 0.22;
        // The visible coin is a mystery power-up. The concrete effect is chosen randomly on pickup.
        this.type = 'MYSTERY';
        this.rotation.y = 0;
        this.scale = { x: 0.28, y: 0.28, z: 0.12 };
    }

    update(deltaTime) {
        this.rotation.z += deltaTime * 3.0;
        this.rotation.y += deltaTime * 2.4;
        this.position.z += Math.sin(performance.now() * 0.003) * 0.0008;
    }
}

class GameState {
    constructor() {
        this.arena = {
            left: -4.35,
            right: 4.35,
            ground: 0,
            ceiling: 3.35,
            goalHeight: 1.18,
            goalDepth: 0.55
        };
        this.score = { player1: 0, player2: 0 };
        this.scoreLimit = 5;
        this.difficulties = [
            { name: 'Easy', ballMaxSpeed: 6.2, playerSpeedMultiplier: 0.9, shotPower: 4.1 },
            { name: 'Normal', ballMaxSpeed: 7.4, playerSpeedMultiplier: 1.0, shotPower: 4.8 },
            { name: 'Fast', ballMaxSpeed: 9.0, playerSpeedMultiplier: 1.12, shotPower: 5.5 }
        ];
        this.difficultyIndex = 1;
        this.player1 = new HeadSoccerPlayer(-2.6, 1);
        this.player2 = new HeadSoccerPlayer(2.6, 2);
        this.ball = new SoccerBall();
        this.ball.reset(1);
        this.keys = {};
        this.pressedThisFrame = {};
        this.lastTime = 0;
        this.powerUp = null;
        this.powerUpSpawnTimer = 7.0;
        this.stadiumLightsOn = true;
        this.matchFinished = false;
        this.statusTimeout = null;
        this.setupInput();
        this.updateScoreDisplay();
        this.updateDifficultyDisplay();
        this.showStatus('HEAD SOCCER: first to 5 wins!', 2600);
    }

    get difficulty() {
        return this.difficulties[this.difficultyIndex];
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
            if (!this.keys[key]) this.pressedThisFrame[key] = true;
            this.keys[key] = true;
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    controlsForPlayer(playerNumber) {
        if (playerNumber === 1) {
            return {
                left: this.keys['a'],
                right: this.keys['d'],
                jump: this.keys['w'],
                kickPressed: this.pressedThisFrame['s']
            };
        }
        return {
            left: this.keys['arrowleft'],
            right: this.keys['arrowright'],
            jump: this.keys['arrowup'],
            kickPressed: this.pressedThisFrame['arrowdown']
        };
    }

    updateScoreDisplay() {
        const p1 = document.getElementById('player1Score');
        const p2 = document.getElementById('player2Score');
        if (p1) p1.textContent = this.score.player1;
        if (p2) p2.textContent = this.score.player2;
    }

    updateDifficultyDisplay() {
        const label = document.getElementById('difficultyLabel');
        if (label) label.textContent = this.difficulty.name;
    }

    showStatus(message, duration = 1800) {
        const element = document.getElementById('statusMessage');
        if (!element) return;
        element.textContent = message;
        element.style.display = 'block';
        if (this.statusTimeout) clearTimeout(this.statusTimeout);
        this.statusTimeout = setTimeout(() => { element.style.display = 'none'; }, duration);
    }

    resetMatch() {
        this.matchFinished = false;
        this.score.player1 = 0;
        this.score.player2 = 0;
        this.updateScoreDisplay();
        this.resetRound(Math.random() < 0.5 ? 1 : -1);
        this.showStatus('New match started!', 1600);
    }

    resetRound(direction = 1) {
        this.player1.position.x = -2.6;
        this.player1.position.z = 0;
        this.player1.velocity.x = 0;
        this.player1.velocity.z = 0;
        this.player1.direction = 1;
        this.player1.bigHeadTimer = 0;
        this.player1.superShotTimer = 0;
        this.player1.bigGoalTimer = 0;
        this.player2.position.x = 2.6;
        this.player2.position.z = 0;
        this.player2.velocity.x = 0;
        this.player2.velocity.z = 0;
        this.player2.direction = -1;
        this.player2.bigHeadTimer = 0;
        this.player2.superShotTimer = 0;
        this.player2.bigGoalTimer = 0;
        this.ball.reset(direction);
        this.powerUp = null;
        this.powerUpSpawnTimer = 6.0;
    }

    getRandomPowerUpType() {
        // Random effect, independent of the player who collects the coin.
        const types = ['BIG_HEAD', 'SUPER_SHOT', 'BIG_GOAL'];
        return types[Math.floor(Math.random() * types.length)];
    }

    powerUpLabel(type) {
        if (type === 'BIG_HEAD') return 'Big Head';
        if (type === 'SUPER_SHOT') return 'Power Shot';
        if (type === 'BIG_GOAL') return 'Big Goal';
        return type.replace('_', ' ');
    }

    getLeftGoalHeight() {
        // Left goal is the target for player 2.
        return this.arena.goalHeight * (this.player2.bigGoalTimer > 0 ? 1.55 : 1.0);
    }

    getRightGoalHeight() {
        // Right goal is the target for player 1.
        return this.arena.goalHeight * (this.player1.bigGoalTimer > 0 ? 1.55 : 1.0);
    }

    spawnPowerUp() {
        if (this.powerUp) return;

        // Spawn the coin at a random visible position inside the playable field.
        // Most coins appear around standing head height, so players can collect
        // them while running. Some coins require a small jump and only a few are high.
        const marginX = 0.75;
        const minX = this.arena.left + marginX;
        const maxX = this.arena.right - marginX;

        function randomRange(min, max) {
            return min + Math.random() * (max - min);
        }

        let x = 0;
        let z = 0;
        for (let attempt = 0; attempt < 30; attempt++) {
            x = randomRange(minX, maxX);

            const band = Math.random();
            if (band < 0.60) {
                // Walk-through coin: reachable by the normal standing head.
                z = randomRange(0.95, 1.30);
            } else if (band < 0.90) {
                // Small jump coin.
                z = randomRange(1.35, 1.85);
            } else {
                // High reward coin.
                z = randomRange(1.95, Math.min(this.arena.ceiling - 0.55, 2.45));
            }

            // Do not spawn directly inside a player or directly on the ball.
            const tooCloseToP1 = Math.abs(x - this.player1.position.x) < 0.75 && z < 1.45;
            const tooCloseToP2 = Math.abs(x - this.player2.position.x) < 0.75 && z < 1.45;
            const dxBall = x - this.ball.position.x;
            const dzBall = z - this.ball.position.z;
            const tooCloseToBall = dxBall * dxBall + dzBall * dzBall < 0.55 * 0.55;
            if (!tooCloseToP1 && !tooCloseToP2 && !tooCloseToBall) break;
        }

        this.powerUp = new PowerUp(x, z);
    }

    update(currentTime) {
        let deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000.0 : 0.016;
        deltaTime = Math.min(deltaTime, 0.032);
        this.lastTime = currentTime;

        if (this.pressedThisFrame[' ']) this.resetMatch();
        if (this.pressedThisFrame['h']) {
            const controls = document.getElementById('controlsInfo');
            if (controls) controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
        }
        if (this.pressedThisFrame['o']) {
            this.stadiumLightsOn = !this.stadiumLightsOn;
            this.showStatus(this.stadiumLightsOn ? 'Stadium lights ON' : 'Stadium lights OFF', 1200);
        }
        if (this.pressedThisFrame['+'] || this.pressedThisFrame['=']) {
            this.difficultyIndex = Math.min(this.difficulties.length - 1, this.difficultyIndex + 1);
            this.updateDifficultyDisplay();
            this.showStatus(`Difficulty: ${this.difficulty.name}`, 1200);
        }
        if (this.pressedThisFrame['-'] || this.pressedThisFrame['_']) {
            this.difficultyIndex = Math.max(0, this.difficultyIndex - 1);
            this.updateDifficultyDisplay();
            this.showStatus(`Difficulty: ${this.difficulty.name}`, 1200);
        }

        if (this.matchFinished) {
            this.pressedThisFrame = {};
            return;
        }

        // Use smaller physics steps so the ball cannot tunnel through a player in one large frame.
        const physicsSteps = 3;
        const stepTime = deltaTime / physicsSteps;
        for (let i = 0; i < physicsSteps; i++) {
            const c1 = this.controlsForPlayer(1);
            const c2 = this.controlsForPlayer(2);

            // A kick is a single-frame action, so only use it in the first physics sub-step.
            if (i > 0) {
                c1.kickPressed = false;
                c2.kickPressed = false;
            }

            this.player1.update(stepTime, c1, this.difficulty, this.arena);
            this.player2.update(stepTime, c2, this.difficulty, this.arena);
            this.ball.update(stepTime, this.difficulty);

            this.checkCollisions();
        }

        if (this.powerUp) this.powerUp.update(deltaTime);
        this.powerUpSpawnTimer -= deltaTime;
        if (this.powerUpSpawnTimer <= 0) {
            this.spawnPowerUp();
            this.powerUpSpawnTimer = 10.0 + Math.random() * 5.0;
        }

        this.pressedThisFrame = {};
    }

    checkCollisions() {
        this.handleBallArenaCollision();
        this.handlePlayerPlayerCollision();
        this.handleAllPlayerBallCollisions();
        this.handleBallArenaCollision();
        this.handlePowerUpCollision();
    }

    getPlayerCollisionParts(player) {
        const head = player.headCenter;
        const body = player.bodyCenter;
        const frontFootX = player.position.x + player.direction * 0.28;
        const kickActive = player.kickTimer > 0;
        const superShot = player.superShotTimer > 0;
        const baseShot = this.difficulty.shotPower * (superShot ? 1.55 : 1.0);
        const kickPower = kickActive ? player.direction * baseShot : 0;

        return [
            { player, part: 'head', cx: head.x, cz: head.z, radius: player.headRadius, extraVelocityX: player.velocity.x, extraVelocityZ: player.velocity.z, kickPower: kickPower * 0.65 },
            { player, part: 'body', cx: body.x, cz: body.z, radius: 0.34, extraVelocityX: player.velocity.x, extraVelocityZ: player.velocity.z, kickPower: 0 },
            { player, part: 'foot', cx: frontFootX, cz: player.position.z + 0.18, radius: kickActive ? 0.34 : 0.22, extraVelocityX: player.velocity.x, extraVelocityZ: player.velocity.z, kickPower }
        ];
    }

    getOverlappingParts(parts) {
        const ball = this.ball;
        return parts.map(part => {
            const dx = ball.position.x - part.cx;
            const dz = ball.position.z - part.cz;
            const distance = Math.hypot(dx, dz);
            const minDist = ball.radius + part.radius;
            return { ...part, dx, dz, distance, minDist, overlap: minDist - distance };
        }).filter(part => part.overlap > 0);
    }

    handleAllPlayerBallCollisions() {
        const parts = [
            ...this.getPlayerCollisionParts(this.player1),
            ...this.getPlayerCollisionParts(this.player2)
        ];

        const overlaps = this.getOverlappingParts(parts);
        const touchesPlayer1 = overlaps.some(part => part.player === this.player1);
        const touchesPlayer2 = overlaps.some(part => part.player === this.player2);

        // If both players squeeze the ball at the same time, push it upward instead of
        // resolving left player then right player and teleporting it to one side.
        if (touchesPlayer1 && touchesPlayer2 && this.resolveSandwichedBall(overlaps)) {
            return;
        }

        // Normal case: resolve the strongest current contact per player. This is stable
        // but still keeps the old bouncy arcade feeling.
        for (let pass = 0; pass < 2; pass++) {
            for (const player of [this.player1, this.player2]) {
                const currentParts = this.getPlayerCollisionParts(player);
                const currentOverlaps = this.getOverlappingParts(currentParts);
                if (currentOverlaps.length === 0) continue;
                currentOverlaps.sort((a, b) => b.overlap - a.overlap);
                const contact = currentOverlaps[0];
                this.collideBallWithCircle(
                    contact.cx, contact.cz, contact.radius,
                    contact.extraVelocityX, contact.extraVelocityZ, contact.kickPower
                );
            }
        }
    }

    resolveSandwichedBall(overlaps) {
        const ball = this.ball;
        const leftPlayer = this.player1.position.x <= this.player2.position.x ? this.player1 : this.player2;
        const rightPlayer = leftPlayer === this.player1 ? this.player2 : this.player1;
        const gap = rightPlayer.position.x - leftPlayer.position.x;
        const ballBetweenPlayers = ball.position.x > leftPlayer.position.x - 0.15 && ball.position.x < rightPlayer.position.x + 0.15;
        const lowBall = ball.position.z < 1.15;

        if (!ballBetweenPlayers || !lowBall || gap > 1.35) return false;

        const centerX = (leftPlayer.position.x + rightPlayer.position.x) * 0.5;
        let escapeZ = ball.radius;

        for (const contact of overlaps) {
            const dx = centerX - contact.cx;
            const minDist = ball.radius + contact.radius + 0.018;
            const neededDzSq = minDist * minDist - dx * dx;
            if (neededDzSq > 0) {
                escapeZ = Math.max(escapeZ, contact.cz + Math.sqrt(neededDzSq));
            }
        }

        ball.position.x = centerX;
        ball.position.z = Math.min(this.arena.ceiling - ball.radius, Math.max(ball.position.z, escapeZ));

        // Pop the ball upward like in Head Soccer instead of letting it choose a random side.
        ball.velocity.x *= 0.35;
        ball.velocity.z = Math.max(ball.velocity.z, 3.15);
        return true;
    }

    handlePlayerPlayerCollision() {
        const p1 = this.player1;
        const p2 = this.player2;
        const minDistance = 0.72;
        const dx = p2.position.x - p1.position.x;
        const distance = Math.abs(dx);

        if (distance < minDistance) {
            const direction = dx >= 0 ? 1 : -1;
            const correction = (minDistance - distance) * 0.5;
            p1.position.x -= correction * direction;
            p2.position.x += correction * direction;

            p1.position.x = Math.max(this.arena.left + 0.45, Math.min(this.arena.right - 0.45, p1.position.x));
            p2.position.x = Math.max(this.arena.left + 0.45, Math.min(this.arena.right - 0.45, p2.position.x));
        }
    }

    handleBallArenaCollision() {
        const ball = this.ball;
        const a = this.arena;

        if (ball.position.z + ball.radius > a.ceiling) {
            ball.position.z = a.ceiling - ball.radius;
            ball.velocity.z *= -0.65;
        }

        if (ball.position.x - ball.radius < a.left) {
            if (ball.position.z < this.getLeftGoalHeight()) this.goalScored(2);
            else {
                ball.position.x = a.left + ball.radius;
                ball.velocity.x *= -0.82;
            }
        }

        if (ball.position.x + ball.radius > a.right) {
            if (ball.position.z < this.getRightGoalHeight()) this.goalScored(1);
            else {
                ball.position.x = a.right - ball.radius;
                ball.velocity.x *= -0.82;
            }
        }
    }

    goalScored(playerNumber) {
        if (playerNumber === 1) this.score.player1++;
        else this.score.player2++;
        this.updateScoreDisplay();

        if (this.score.player1 >= this.scoreLimit || this.score.player2 >= this.scoreLimit) {
            const winner = this.score.player1 > this.score.player2 ? 'Player 1' : 'Player 2';
            this.matchFinished = true;
            this.showStatus(`${winner} wins the match! Press SPACE for a new game.`, 4200);
            this.resetRound(playerNumber === 1 ? -1 : 1);
            return;
        }

        this.showStatus(`GOOOAL for Player ${playerNumber}!`, 1800);
        this.resetRound(playerNumber === 1 ? -1 : 1);
    }

    collideBallWithCircle(cx, cz, radius, extraVelocityX, extraVelocityZ, kickPower = 0) {
        const ball = this.ball;
        let dx = ball.position.x - cx;
        let dz = ball.position.z - cz;
        let distanceSq = dx * dx + dz * dz;
        const minDist = ball.radius + radius;
        if (distanceSq >= minDist * minDist) return false;

        let distance = Math.sqrt(distanceSq);
        let nx;
        let nz;

        // If the ball center is almost exactly inside the player center, choose a stable
        // escape direction instead of producing a zero normal.
        if (distance < 0.0001) {
            nx = ball.position.x >= cx ? 1 : -1;
            nz = 0.25;
            const len = Math.hypot(nx, nz);
            nx /= len;
            nz /= len;
            distance = 0.0001;
        } else {
            nx = dx / distance;
            nz = dz / distance;
        }

        const overlap = minDist - distance;
        const separationPadding = 0.012;
        ball.position.x += nx * (overlap + separationPadding);
        ball.position.z = Math.max(ball.radius, ball.position.z + nz * (overlap + separationPadding));

        const incoming = ball.velocity.x * nx + ball.velocity.z * nz;
        if (incoming < 0) {
            ball.velocity.x -= 1.50 * incoming * nx;
            ball.velocity.z -= 1.50 * incoming * nz;
        }

        // Small continuous push from the player movement, plus a stronger impulse when kicking.
        ball.velocity.x += nx * 0.36 + extraVelocityX * 0.14;
        ball.velocity.z += Math.max(nz * 0.58, 0.18) + extraVelocityZ * 0.08;

        if (kickPower !== 0) {
            ball.velocity.x += Math.sign(kickPower) * Math.abs(kickPower);
            ball.velocity.z += 1.0;
        }
        return true;
    }

    handlePlayerBallCollision(player) {
        const head = player.headCenter;
        const body = player.bodyCenter;
        const frontFootX = player.position.x + player.direction * 0.28;
        const kickActive = player.kickTimer > 0;
        const superShot = player.superShotTimer > 0;
        const baseShot = this.difficulty.shotPower * (superShot ? 1.55 : 1.0);
        const kickPower = kickActive ? player.direction * baseShot : 0;

        this.collideBallWithCircle(head.x, head.z, player.headRadius, player.velocity.x, player.velocity.z, kickPower * 0.65);
        this.collideBallWithCircle(body.x, body.z, 0.34, player.velocity.x, player.velocity.z, 0);
        this.collideBallWithCircle(frontFootX, player.position.z + 0.18, kickActive ? 0.34 : 0.22, player.velocity.x, player.velocity.z, kickPower);
    }

    handlePowerUpCollision() {
        if (!this.powerUp) return;
        for (const player of [this.player1, this.player2]) {
            const head = player.headCenter;
            const dx = head.x - this.powerUp.position.x;
            const dz = head.z - this.powerUp.position.z;
            const radius = player.headRadius + this.powerUp.radius;
            if (dx * dx + dz * dz < radius * radius) {
                const type = this.getRandomPowerUpType();
                player.activatePowerUp(type);
                this.showStatus(`${player.team === 1 ? 'Player 1' : 'Player 2'} got ${this.powerUpLabel(type)}!`, 1800);
                this.powerUp = null;
                return;
            }
        }
    }
}
