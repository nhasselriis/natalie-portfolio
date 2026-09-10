'use strict';

(() => {
    const canvas = document.querySelector('#snake-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const overlay = document.querySelector('#snake-overlay');
    const overlayMessage = document.querySelector('#overlay-message');
    const overlayKicker = document.querySelector('#overlay-kicker');
    const overlayTitle = document.querySelector('#overlay-title');
    const overlayResume = document.querySelector('#overlay-resume');
    const overlayNew = document.querySelector('#overlay-new');
    const difficultyActions = document.querySelector('#difficulty-actions');
    const pauseActions = document.querySelector('#pause-actions');
    const difficultyButtons = document.querySelectorAll('[data-difficulty]');
    const difficultyLabel = document.querySelector('#difficulty-label');
    const scoreDisplay = document.querySelector('#score');
    const bestDisplay = document.querySelector('#best-score');
    const lotusDisplay = document.querySelector('#lotus-count');
    const comboDisplay = document.querySelector('#combo-count');
    const comboFill = document.querySelector('#combo-fill');
    const comboLabel = document.querySelector('#combo-label');
    const effectsList = document.querySelector('#effects-list');
    const effectsSummary = document.querySelector('#effects-summary');
    const statusDisplay = document.querySelector('#game-status');
    const touchDirectionButtons = document.querySelectorAll('[data-direction]');
    const touchPauseButton = document.querySelector('#touch-pause');

    const BOARD_TILES = 18;
    const BOARD_GRID_X = canvas.width * (124.13 / 1254);
    const BOARD_GRID_Y = canvas.height * (117.15 / 1254);
    const BOARD_GRID_WIDTH = canvas.width * ((55.7108 * BOARD_TILES) / 1254);
    const BOARD_GRID_HEIGHT = canvas.height * ((56.9510 * BOARD_TILES) / 1254);
    const TILE_X = BOARD_GRID_WIDTH / BOARD_TILES;
    const TILE_Y = BOARD_GRID_HEIGHT / BOARD_TILES;
    // Use the smaller dimension for sprite sizing so pieces stay inside cells.
    const TILE = Math.min(TILE_X, TILE_Y);
    const boardArtwork = new Image();
    boardArtwork.src = 'assets/images/snake/jasmine-game-board.png';
    boardArtwork.addEventListener('load', () => drawScene());

    function loadSprite(src) {
        const image = new Image();
        image.src = src;
        image.addEventListener('load', () => drawScene());
        return image;
    }

    const spriteImages = {
        snakeHead: loadSprite('assets/images/snake/dragon-snake-head.png'),
        snakeBody: loadSprite('assets/images/snake/dragon-snake-body.png'),
        leaf: loadSprite('assets/images/snake/item-tea-leaf.png'),
        cup: loadSprite('assets/images/snake/item-tea-cup.png'),
        lotus: loadSprite('assets/images/snake/item-white-lotus-tile.png'),
        jasmine: loadSprite('assets/images/snake/item-jasmine-blossom.png'),
        seed: loadSprite('assets/images/snake/item-lotus-seed.png'),
        teapot: loadSprite('assets/images/snake/item-teapot.png'),
        dragon: loadSprite('assets/images/snake/item-dragon-tea.png')
    };

    const itemSprites = loadImageMap({
        leaf: 'assets/images/snake/item-tea-leaf.png',
        cup: 'assets/images/snake/item-tea-cup.png',
        lotus: 'assets/images/snake/item-white-lotus-tile.png',
        jasmine: 'assets/images/snake/item-jasmine-blossom.png',
        seed: 'assets/images/snake/item-lotus-seed.png',
        teapot: 'assets/images/snake/item-teapot.png',
        dragon: 'assets/images/snake/item-dragon-tea.png'
    });
    const COMBO_WINDOW = 5000;
    const INVINCIBILITY_DURATION = 8000;
    const SPEED_DURATION = 6500;
    const SPEED_STACK_MULTIPLIER = 0.68;
    const MIN_SPEED_STEP = 42;
    const BEST_STORAGE_KEY = 'teaGardenSnakePrototypeBest';

    const DIFFICULTIES = {
        easy: { label: 'Easy', step: 180 },
        medium: { label: 'Medium', step: 145 },
        hard: { label: 'Hard', step: 110 }
    };

    const vectors = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
    };

    const itemDefinitions = {
        leaf: { label: 'Tea Leaf', basePoints: 1, weight: 44 },
        cup: { label: 'Tea Cup', basePoints: 3, weight: 18 },
        lotus: { label: 'White Lotus Tile', basePoints: 10, weight: 11 },
        jasmine: { label: 'Jasmine Blossom', basePoints: 0, weight: 10 },
        seed: { label: 'Lotus Seed', basePoints: 0, weight: 7 },
        teapot: { label: 'Teapot', basePoints: 0, weight: 6 },
        dragon: { label: 'Dragon Tea', basePoints: 0, weight: 4 }
    };

    const state = {
        snake: [],
        direction: { ...vectors.right },
        nextDirection: { ...vectors.right },
        item: null,
        running: false,
        paused: false,
        gameOver: false,
        difficulty: null,
        baseStep: DIFFICULTIES.medium.step,
        score: 0,
        best: Number(localStorage.getItem(BEST_STORAGE_KEY) || 0),
        comboChain: 0,
        comboUntil: 0,
        lotusCharges: 0,
        invincibleUntil: 0,
        speedUntil: 0,
        speedStacks: 0,
        growBy: 0,
        pauseStartedAt: 0,
        lastFrame: 0,
        accumulator: 0
    };

    bestDisplay.textContent = String(state.best);
    prepareGarden();
    showStartScreen();
    requestAnimationFrame(loop);

    difficultyButtons.forEach((button) => {
        button.addEventListener('click', () => startDifficulty(button.dataset.difficulty));
    });

    overlayResume.addEventListener('click', () => {
        if (state.gameOver) {
            startDifficulty(state.difficulty || 'medium');
        } else {
            resumeGarden();
        }
    });

    overlayNew.addEventListener('click', () => showStartScreen());

    touchDirectionButtons.forEach((button) => {
        button.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            const requested = button.dataset.direction;
            if (!requested || !state.running || state.paused || state.gameOver) return;
            updateNextDirection(vectors[requested]);
        });
    });

    if (touchPauseButton) {
        touchPauseButton.addEventListener('click', () => {
            if (!state.running || state.gameOver) return;
            if (state.paused) resumeGarden();
            else pauseGarden();
        });
    }

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
            if (state.running && !state.gameOver) {
                event.preventDefault();
                if (state.paused) resumeGarden();
                else pauseGarden();
            }
            return;
        }

        const directions = {
            ArrowUp: 'up', w: 'up', W: 'up',
            ArrowDown: 'down', s: 'down', S: 'down',
            ArrowLeft: 'left', a: 'left', A: 'left',
            ArrowRight: 'right', d: 'right', D: 'right'
        };

        const requested = directions[event.key];
        if (!requested || !state.running || state.paused || state.gameOver) return;
        event.preventDefault();
        updateNextDirection(vectors[requested]);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state.running && !state.paused && !state.gameOver) {
            pauseGarden('The garden paused while this tab was away.');
        }
    });

    function prepareGarden() {
        state.snake = [
            { x: 6, y: 9 },
            { x: 5, y: 9 },
            { x: 4, y: 9 }
        ];
        state.direction = { ...vectors.right };
        state.nextDirection = { ...vectors.right };
        state.score = 0;
        state.comboChain = 0;
        state.comboUntil = 0;
        state.lotusCharges = 0;
        state.invincibleUntil = 0;
        state.speedUntil = 0;
        state.speedStacks = 0;
        state.growBy = 0;
        state.pauseStartedAt = 0;
        state.running = false;
        state.paused = false;
        state.gameOver = false;
        state.accumulator = 0;
        spawnItem();
        updateHud();
        drawScene();
    }

    function showStartScreen() {
        prepareGarden();
        state.difficulty = null;
        state.baseStep = DIFFICULTIES.medium.step;
        difficultyLabel.textContent = 'Choose a level';
        overlay.dataset.mode = 'start';
        overlayKicker.textContent = 'Choose Your Garden';
        overlayTitle.textContent = 'Jasmine Dragon: Zen Garden';
        overlayMessage.textContent = 'Choose a starting pace. Easy, Medium, and Hard use the same rules; only the snake’s starting speed changes.';
        difficultyActions.hidden = false;
        pauseActions.hidden = true;
        overlay.removeAttribute('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        setStatus('Choose Easy, Medium, or Hard to begin.');
    }

    function startDifficulty(key) {
        const difficulty = DIFFICULTIES[key] || DIFFICULTIES.medium;
        state.difficulty = key in DIFFICULTIES ? key : 'medium';
        state.baseStep = difficulty.step;
        prepareGarden();
        state.difficulty = key in DIFFICULTIES ? key : 'medium';
        state.baseStep = difficulty.step;
        state.running = true;
        difficultyLabel.textContent = difficulty.label;
        closeOverlay();
        setStatus(`${difficulty.label} garden started. Use WASD or the arrow keys to guide the snake.`);
    }

    function loop(timestamp) {
        if (!state.lastFrame) state.lastFrame = timestamp;
        const delta = timestamp - state.lastFrame;
        state.lastFrame = timestamp;

        if (state.running && !state.paused && !state.gameOver) {
            state.accumulator += delta;
            const now = Date.now();
            const activeSpeedStacks = now < state.speedUntil ? state.speedStacks : 0;
            if (!activeSpeedStacks && state.speedStacks) state.speedStacks = 0;
            const stepDuration = activeSpeedStacks
                ? Math.max(MIN_SPEED_STEP, state.baseStep * Math.pow(SPEED_STACK_MULTIPLIER, activeSpeedStacks))
                : state.baseStep;

            while (state.accumulator >= stepDuration) {
                state.accumulator -= stepDuration;
                stepGame();
                if (state.gameOver) break;
            }
        }

        drawScene();
        updateHud();
        requestAnimationFrame(loop);
    }

    function updateNextDirection(requested) {
        if (!requested) return;
        if (requested.x === -state.direction.x && requested.y === -state.direction.y) return;
        state.nextDirection = { ...requested };
    }

    function stepGame() {
        state.direction = { ...state.nextDirection };
        const head = {
            x: state.snake[0].x + state.direction.x,
            y: state.snake[0].y + state.direction.y
        };

        const invincible = Date.now() < state.invincibleUntil;

        if (invincible) {
            if (head.x < 0) head.x = BOARD_TILES - 1;
            if (head.x >= BOARD_TILES) head.x = 0;
            if (head.y < 0) head.y = BOARD_TILES - 1;
            if (head.y >= BOARD_TILES) head.y = 0;
        }

        const hitWall = head.x < 0 || head.x >= BOARD_TILES || head.y < 0 || head.y >= BOARD_TILES;
        const hitSelf = state.snake.some((segment) => segment.x === head.x && segment.y === head.y);

        if ((hitWall || hitSelf) && !invincible) {
            endGame();
            return;
        }

        state.snake.unshift(head);

        if (state.item && head.x === state.item.x && head.y === state.item.y) {
            consumeItem(state.item.type);
            spawnItem();
        } else if (state.growBy > 0) {
            state.growBy -= 1;
        } else {
            state.snake.pop();
        }
    }

    function consumeItem(type) {
        const now = Date.now();
        const basePoints = itemDefinitions[type].basePoints || 0;

        if (type === 'jasmine') {
            state.comboUntil = now + COMBO_WINDOW;
            if (state.comboChain === 0) state.comboChain = 1;
            setStatus('Jasmine Blossom restored the combo timer.');
        }

        if (type === 'seed') {
            state.invincibleUntil = extendEffect(state.invincibleUntil, now, INVINCIBILITY_DURATION);
            const seconds = Math.ceil((state.invincibleUntil - now) / 1000);
            setStatus(`Lotus Seed added 8 seconds of invincibility. ${seconds} seconds are now stored.`);
        }

        if (type === 'teapot') {
            state.growBy += 3;
            setStatus(`Teapot blessing! The snake will grow by 3 more segments (${state.growBy} queued).`);
        }

        if (type === 'dragon') {
            if (now >= state.speedUntil) state.speedStacks = 0;
            state.speedStacks += 1;
            state.speedUntil = extendEffect(state.speedUntil, now, SPEED_DURATION);
            const seconds = ((state.speedUntil - now) / 1000).toFixed(1);
            setStatus(`Dragon Tea stack x${state.speedStacks}! Speed increased again, with ${seconds} seconds remaining.`);
        }

        if (basePoints > 0) {
            if (now <= state.comboUntil) state.comboChain += 1;
            else state.comboChain = 1;
            state.comboUntil = now + COMBO_WINDOW;

            let multiplier = 1;
            if (state.lotusCharges > 0) {
                multiplier = 2;
                state.lotusCharges -= 1;
            }

            const comboBonus = Math.max(0, state.comboChain - 1);
            const gained = (basePoints * multiplier) + comboBonus;
            state.score += gained;

            if (type === 'lotus') {
                state.lotusCharges += 4;
                setStatus(`White Lotus Tile collected for +${gained}. ${state.lotusCharges} double-score charges are stored.`);
            } else if (type === 'cup') {
                setStatus(`Tea Cup collected for +${gained}.`);
            } else {
                setStatus(`Tea Leaf collected for +${gained}.`);
            }
        }

        if (state.score > state.best) {
            state.best = state.score;
            localStorage.setItem(BEST_STORAGE_KEY, String(state.best));
        }
    }

    function extendEffect(currentUntil, now, duration) {
        return Math.max(currentUntil, now) + duration;
    }

    function spawnItem() {
        const occupied = new Set(state.snake.map((segment) => `${segment.x},${segment.y}`));
        let x;
        let y;
        do {
            x = Math.floor(Math.random() * BOARD_TILES);
            y = Math.floor(Math.random() * BOARD_TILES);
        } while (occupied.has(`${x},${y}`));

        state.item = { x, y, type: weightedItemType() };
    }

    function weightedItemType() {
        const totalWeight = Object.values(itemDefinitions).reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;
        for (const [type, definition] of Object.entries(itemDefinitions)) {
            roll -= definition.weight;
            if (roll <= 0) return type;
        }
        return 'leaf';
    }

    function endGame() {
        state.running = false;
        state.gameOver = true;
        state.pauseStartedAt = Date.now();
        openPauseOverlay('gameover', `The garden has gone still. Final score: ${state.score}.`);
        setStatus(`Game over. Final score: ${state.score}.`);
    }

    function pauseGarden(message = 'The garden is resting for a moment.') {
        if (!state.running || state.paused || state.gameOver) return;
        state.paused = true;
        state.pauseStartedAt = Date.now();
        state.accumulator = 0;
        openPauseOverlay('pause', message);
        setStatus('Game paused. Power-up and combo timers are frozen.');
    }

    function resumeGarden() {
        if (!state.running || !state.paused || state.gameOver) return;
        const resumedAt = Date.now();
        const pausedFor = Math.max(0, resumedAt - state.pauseStartedAt);
        shiftActiveTimers(pausedFor);
        state.pauseStartedAt = 0;
        state.paused = false;
        state.accumulator = 0;
        closeOverlay();
        setStatus('Game resumed. Timers continue from where they were paused.');
    }

    function shiftActiveTimers(pausedFor) {
        if (pausedFor <= 0) return;
        const pausedAt = state.pauseStartedAt;
        ['comboUntil', 'invincibleUntil', 'speedUntil'].forEach((key) => {
            if (state[key] > pausedAt) state[key] += pausedFor;
        });
    }

    function openPauseOverlay(mode, message) {
        overlay.dataset.mode = mode;
        overlayKicker.textContent = mode === 'gameover' ? 'Garden Complete' : 'Pause Menu';
        overlayTitle.textContent = mode === 'gameover' ? 'The Garden Rests' : 'Tea Time';
        overlayMessage.textContent = message;
        overlayResume.textContent = mode === 'gameover' ? 'Play Again' : 'Resume';
        overlayNew.textContent = 'Choose Level';
        difficultyActions.hidden = true;
        pauseActions.hidden = false;
        overlay.removeAttribute('hidden');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function closeOverlay() {
        overlay.setAttribute('hidden', '');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.removeAttribute('data-mode');
    }

    function gameClockNow() {
        if (state.paused && state.pauseStartedAt) return state.pauseStartedAt;
        if (state.gameOver && state.pauseStartedAt) return state.pauseStartedAt;
        return Date.now();
    }

    function updateHud() {
        const now = gameClockNow();
        scoreDisplay.textContent = String(state.score);
        bestDisplay.textContent = String(state.best);
        lotusDisplay.textContent = String(state.lotusCharges);
        comboDisplay.textContent = `x${Math.max(1, state.comboChain)}`;

        const comboRemaining = Math.max(0, state.comboUntil - now);
        const comboPercent = Math.min(100, (comboRemaining / COMBO_WINDOW) * 100);
        comboFill.style.width = `${comboPercent}%`;
        comboLabel.textContent = comboRemaining > 0 ? `${(comboRemaining / 1000).toFixed(1)}s` : 'Ready';

        const effects = [];
        if (now < state.invincibleUntil) {
            effects.push({ type: 'seed', name: 'Lotus Seed', detail: `${((state.invincibleUntil - now) / 1000).toFixed(1)}s` });
        }
        if (now < state.speedUntil && state.speedStacks > 0) {
            effects.push({
                type: 'dragon',
                name: 'Dragon Tea',
                detail: `x${state.speedStacks} • ${((state.speedUntil - now) / 1000).toFixed(1)}s`
            });
        } else if (state.speedStacks) {
            state.speedStacks = 0;
        }
        if (state.lotusCharges > 0) {
            effects.push({ type: 'lotus', name: 'White Lotus', detail: `x${state.lotusCharges}` });
        }
        if (state.growBy > 0) {
            effects.push({ type: 'pot', name: 'Teapot', detail: `+${state.growBy}` });
        }

        effectsSummary.textContent = effects.length ? `${effects.length} active` : 'None';
        effectsList.innerHTML = effects.length
            ? effects.map(effectChipMarkup).join('')
            : '<span class="snake-effect-chip snake-effect-chip-muted">No active effects</span>';
    }

    function effectChipMarkup(effect) {
        return `<span class="snake-effect-chip"><span class="legend-icon snake-effect-icon legend-${effect.type}" aria-hidden="true"></span><span class="snake-effect-copy"><strong>${effect.name}</strong><span>${effect.detail}</span></span></span>`;
    }

    function drawScene() {
        drawBoard();
        drawItem();
        drawSnake();
    }

    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (boardArtwork.complete && boardArtwork.naturalWidth) {
            ctx.drawImage(boardArtwork, 0, 0, canvas.width, canvas.height);
            return;
        }

        // Fallback while the artwork is loading.
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#c8b078');
        gradient.addColorStop(1, '#a58a53');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(59, 42, 24, 0.24)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= BOARD_TILES; i += 1) {
            const x = BOARD_GRID_X + i * TILE_X;
            const y = BOARD_GRID_Y + i * TILE_Y;
            ctx.beginPath();
            ctx.moveTo(x, BOARD_GRID_Y);
            ctx.lineTo(x, BOARD_GRID_Y + BOARD_GRID_HEIGHT);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(BOARD_GRID_X, y);
            ctx.lineTo(BOARD_GRID_X + BOARD_GRID_WIDTH, y);
            ctx.stroke();
        }
    }

    function cellCenterX(cellX) {
        return BOARD_GRID_X + (cellX + 0.5) * TILE_X;
    }

    function cellCenterY(cellY) {
        return BOARD_GRID_Y + (cellY + 0.5) * TILE_Y;
    }

    function loadImageMap(pathMap) {
        const images = {};
        Object.entries(pathMap).forEach(([key, src]) => {
            const image = new Image();
            image.src = src;
            image.addEventListener('load', () => drawScene());
            images[key] = image;
        });
        return images;
    }

    function imageReady(image) {
        return Boolean(image && image.complete && image.naturalWidth);
    }

    function directionAngle(vector) {
        return Math.atan2(vector.y, vector.x);
    }

    function segmentAngle(index) {
        const segment = state.snake[index];
        const previous = state.snake[index - 1] || null;
        const next = state.snake[index + 1] || null;

        if (index === 0) return directionAngle(state.direction);
        if (index === state.snake.length - 1 && previous) {
            return Math.atan2(segment.y - previous.y, segment.x - previous.x);
        }
        if (previous && next) {
            return Math.atan2(next.y - previous.y, next.x - previous.x);
        }
        if (next) {
            return Math.atan2(next.y - segment.y, next.x - segment.x);
        }
        if (previous) {
            return Math.atan2(segment.y - previous.y, segment.x - previous.x);
        }
        return 0;
    }

    function drawCenteredSprite(image, x, y, width, height, rotation = 0, options = {}) {
        if (!imageReady(image)) return false;

        const {
            shadowColor = null,
            shadowBlur = 0,
            filter = 'none',
            glowRing = false,
            glowColor = 'rgba(247, 225, 111, .95)'
        } = options;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.filter = filter;
        if (shadowColor && shadowBlur) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
        }
        ctx.drawImage(image, -width / 2, -height / 2, width, height);
        ctx.restore();

        if (glowRing) {
            ctx.save();
            ctx.strokeStyle = glowColor;
            ctx.lineWidth = Math.max(1.5, TILE * 0.08);
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = TILE * 0.45;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(width, height) * 0.32, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        return true;
    }

    function drawSnake() {
        const now = gameClockNow();
        const invincible = now < state.invincibleUntil;
        const speedBoost = now < state.speedUntil && state.speedStacks > 0;
        const speedStackLevel = speedBoost ? state.speedStacks : 0;
        const effectGlow = invincible && speedBoost
            ? 'rgba(100, 235, 125, .98)'
            : invincible
                ? 'rgba(255, 224, 82, .98)'
                : speedBoost
                    ? 'rgba(72, 154, 255, .98)'
                    : null;

        state.snake.forEach((segment, index) => {
            const x = cellCenterX(segment.x);
            const y = cellCenterY(segment.y);
            const isHead = index === 0;

            const sprite = isHead ? spriteImages.snakeHead : spriteImages.snakeBody;

            const frontVector = isHead
                ? state.direction
                : segmentFrontVector(index);
            const rotation = topFrontRotation(frontVector);
            const size = TILE * (isHead ? 0.98 : 0.92);

            const drewSprite = drawCenteredSprite(sprite, x, y, size, size, rotation, {
                shadowColor: effectGlow,
                shadowBlur: effectGlow ? TILE * (0.62 + Math.min(speedStackLevel, 4) * 0.1) : 0,
                filter: speedBoost ? 'saturate(1.08) brightness(1.03)' : 'none'
            });

            if (!drewSprite) {
                drawFallbackJadeOrb(x, y, isHead, effectGlow, speedStackLevel);
                return;
            }

            if (effectGlow) {
                ctx.save();
                ctx.strokeStyle = effectGlow;
                ctx.lineWidth = Math.max(1.25, TILE * 0.05);
                ctx.shadowColor = effectGlow;
                ctx.shadowBlur = TILE * (0.22 + Math.min(speedStackLevel, 4) * 0.07);
                ctx.beginPath();
                ctx.arc(x, y, TILE * 0.41, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    function segmentFrontVector(index) {
        const current = state.snake[index];
        const towardHead = state.snake[index - 1] || current;
        let dx = towardHead.x - current.x;
        let dy = towardHead.y - current.y;

        // When invincibility wraps the snake across an edge, the stored grid
        // coordinates jump from 0 to 17 (or vice versa). Convert that jump back
        // to the single-cell direction the segment is actually facing.
        if (dx > 1) dx = -1;
        else if (dx < -1) dx = 1;
        if (dy > 1) dy = -1;
        else if (dy < -1) dy = 1;

        return { x: Math.sign(dx), y: Math.sign(dy) };
    }

    function topFrontRotation(direction) {
        if (direction.x === 1) return Math.PI / 2;
        if (direction.x === -1) return -Math.PI / 2;
        if (direction.y === 1) return Math.PI;
        return 0;
    }

    function drawFallbackJadeOrb(x, y, isHead, effectGlow, speedStackLevel) {
        const radius = TILE * (isHead ? 0.39 : 0.34);
        ctx.save();
        if (effectGlow) {
            ctx.shadowColor = effectGlow;
            ctx.shadowBlur = TILE * (0.62 + Math.min(speedStackLevel, 4) * 0.1);
        }
        const jade = ctx.createRadialGradient(
            x - radius * 0.35, y - radius * 0.38, radius * 0.08,
            x, y, radius
        );
        jade.addColorStop(0, isHead ? '#b9dfb5' : '#a7d2a3');
        jade.addColorStop(0.22, isHead ? '#72aa78' : '#679b6d');
        jade.addColorStop(0.72, isHead ? '#3f7650' : '#477b54');
        jade.addColorStop(1, isHead ? '#28543b' : '#315f43');
        ctx.fillStyle = jade;
        ctx.strokeStyle = '#234a35';
        ctx.lineWidth = Math.max(1.1, TILE * 0.045);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (isHead) drawRoundEyes(x, y, radius);
    }

    function drawRoundEyes(x, y, radius) {
        const forward = state.direction;
        const side = { x: -forward.y, y: forward.x };
        const forwardOffset = radius * 0.43;
        const sideOffset = radius * 0.32;
        const eyeRadius = radius * 0.105;

        [-1, 1].forEach((sideSign) => {
            const eyeX = x + forward.x * forwardOffset + side.x * sideOffset * sideSign;
            const eyeY = y + forward.y * forwardOffset + side.y * sideOffset * sideSign;
            ctx.fillStyle = '#111713';
            ctx.beginPath();
            ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawVineLink(from, to, index, maxIndex) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const angle = Math.atan2(dy, dx);
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const progression = (maxIndex - index + 1) / Math.max(1, maxIndex);
        const width = TILE * (0.26 + progression * 0.18);

        const linkGradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        linkGradient.addColorStop(0, '#254e2d');
        linkGradient.addColorStop(0.4, '#507d3c');
        linkGradient.addColorStop(1, '#86ab54');

        ctx.save();
        ctx.strokeStyle = linkGradient;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(230, 245, 211, 0.45)';
        ctx.lineWidth = Math.max(2, width * 0.16);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        const normalAngle = angle + Math.PI / 2;
        const offset = width * 0.35;
        if (index % 2 === 0) {
            drawSingleLeaf(midX + Math.cos(normalAngle) * offset, midY + Math.sin(normalAngle) * offset, angle - 0.55, width * 0.62, '#6f9a49', '#34562f');
        }
        if (index % 3 === 0) {
            drawSingleLeaf(midX - Math.cos(normalAngle) * offset * 0.92, midY - Math.sin(normalAngle) * offset * 0.92, angle + 0.65, width * 0.52, '#7aa353', '#35562f');
        }
        if (index % 5 === 0) {
            drawJasmineFlower(midX, midY - offset * 0.35, width * 0.2);
        }
        ctx.restore();
    }

    function drawHead(x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const headGradient = ctx.createLinearGradient(-TILE * 0.9, 0, TILE * 0.55, 0);
        headGradient.addColorStop(0, '#1f4027');
        headGradient.addColorStop(0.32, '#4a7740');
        headGradient.addColorStop(0.72, '#84a654');
        headGradient.addColorStop(1, '#d6df8b');
        ctx.fillStyle = headGradient;
        ctx.strokeStyle = '#27472a';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(TILE * 0.62, 0);
        ctx.quadraticCurveTo(TILE * 0.36, -TILE * 0.38, -TILE * 0.06, -TILE * 0.46);
        ctx.quadraticCurveTo(-TILE * 0.34, -TILE * 0.48, -TILE * 0.7, -TILE * 0.15);
        ctx.quadraticCurveTo(-TILE * 0.76, 0, -TILE * 0.7, TILE * 0.18);
        ctx.quadraticCurveTo(-TILE * 0.34, TILE * 0.48, -TILE * 0.04, TILE * 0.46);
        ctx.quadraticCurveTo(TILE * 0.36, TILE * 0.36, TILE * 0.62, 0);
        ctx.fill();
        ctx.stroke();

        drawHeadLeafCrest(-TILE * 0.08, -TILE * 0.44, 6);
        drawHeadLeafCrest(-TILE * 0.18, TILE * 0.32, 4, true);
        drawSingleLeaf(-TILE * 0.18, -TILE * 0.05, -0.9, TILE * 0.28, '#6f9a49', '#35562f');
        drawJasmineFlower(-TILE * 0.38, -TILE * 0.1, TILE * 0.14);

        ctx.fillStyle = '#e8cb63';
        ctx.beginPath();
        ctx.ellipse(TILE * 0.03, -TILE * 0.1, TILE * 0.16, TILE * 0.11, -0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#39220b';
        ctx.beginPath();
        ctx.ellipse(TILE * 0.06, -TILE * 0.1, TILE * 0.06, TILE * 0.095, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath();
        ctx.arc(TILE * 0.01, -TILE * 0.14, TILE * 0.03, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#526e29';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(TILE * 0.18, TILE * 0.05);
        ctx.quadraticCurveTo(TILE * 0.52, TILE * 0.1, TILE * 0.72, TILE * 0.33);
        ctx.moveTo(TILE * 0.2, TILE * 0.12);
        ctx.quadraticCurveTo(TILE * 0.44, TILE * 0.32, TILE * 0.48, TILE * 0.58);
        ctx.stroke();

        ctx.fillStyle = '#31522e';
        ctx.beginPath();
        ctx.arc(TILE * 0.48, -TILE * 0.04, TILE * 0.028, 0, Math.PI * 2);
        ctx.arc(TILE * 0.48, TILE * 0.07, TILE * 0.028, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawHeadLeafCrest(x, y, count, flip = false) {
        ctx.save();
        ctx.translate(x, y);
        if (flip) ctx.scale(1, -1);
        for (let i = 0; i < count; i += 1) {
            const size = TILE * (0.18 + (count - i) * 0.012);
            drawSingleLeaf(-i * TILE * 0.09, -Math.sin(i * 0.9) * 3, -0.65 + i * 0.14, size, i % 2 === 0 ? '#789d52' : '#5a813e', '#35562f');
        }
        ctx.restore();
    }

    function drawTail(x, y, angle, length) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        const tailGradient = ctx.createLinearGradient(-TILE * 0.45, 0, TILE * 0.65, 0);
        tailGradient.addColorStop(0, '#284d2c');
        tailGradient.addColorStop(0.7, '#7aa353');
        tailGradient.addColorStop(1, '#b5c96d');
        ctx.fillStyle = tailGradient;
        ctx.strokeStyle = '#27472a';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(-TILE * 0.18, -TILE * 0.18);
        ctx.quadraticCurveTo(TILE * 0.16, -TILE * 0.1, TILE * 0.42, 0);
        ctx.quadraticCurveTo(TILE * 0.16, TILE * 0.1, -TILE * 0.18, TILE * 0.18);
        ctx.quadraticCurveTo(-TILE * 0.28, 0, -TILE * 0.18, -TILE * 0.18);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#5e7f31';
        ctx.lineWidth = Math.max(1.5, TILE * 0.06);
        ctx.beginPath();
        ctx.moveTo(TILE * 0.26, 0);
        ctx.quadraticCurveTo(TILE * 0.6, -TILE * 0.04, TILE * 0.72, -TILE * 0.3);
        ctx.stroke();

        if (length > 6) {
            drawSingleLeaf(-TILE * 0.08, -TILE * 0.16, -0.9, TILE * 0.18, '#6f9a49', '#35562f');
        }
        ctx.restore();
    }

    function drawSingleLeaf(x, y, angle, size, fill = '#6f9a49', stroke = '#35562f') {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1, size * 0.08);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-size * 0.24, -size * 0.52, 0, -size);
        ctx.quadraticCurveTo(size * 0.36, -size * 0.54, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(236,244,219,.55)';
        ctx.lineWidth = Math.max(1, size * 0.05);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.08);
        ctx.lineTo(0, -size * 0.84);
        ctx.stroke();
        ctx.restore();
    }

    function drawItem() {
        if (!state.item) return;
        const x = cellCenterX(state.item.x);
        const y = cellCenterY(state.item.y);

        if (drawItemSprite(state.item.type, x, y)) return;

        switch (state.item.type) {
            case 'leaf': drawLeafToken(x, y); break;
            case 'cup': drawTeaCup(x, y); break;
            case 'lotus': drawLotusTile(x, y); break;
            case 'jasmine': drawJasmineToken(x, y); break;
            case 'seed': drawLotusSeed(x, y); break;
            case 'teapot': drawTeapot(x, y); break;
            case 'dragon': drawDragonTea(x, y); break;
            default: drawLeafToken(x, y);
        }
    }

    function drawItemSprite(type, x, y) {
        const spriteKey = {
            leaf: 'leaf',
            cup: 'cup',
            lotus: 'lotus',
            jasmine: 'jasmine',
            seed: 'seed',
            teapot: 'teapot',
            dragon: 'dragon'
        }[type];

        const image = itemSprites[spriteKey];
        if (!imageReady(image)) return false;

        const sizeMap = {
            leaf: TILE * 0.84,
            cup: TILE * 0.92,
            lotus: TILE * 0.92,
            jasmine: TILE * 0.92,
            seed: TILE * 0.9,
            teapot: TILE * 0.92,
            dragon: TILE * 0.92
        };

        const size = sizeMap[type] || TILE * 0.9;
        const glowColor = type === 'dragon'
            ? 'rgba(187, 234, 176, .75)'
            : (type === 'seed' || type === 'lotus' ? 'rgba(255, 239, 163, .72)' : null);

        drawCenteredSprite(image, x, y, size, size, 0, {
            shadowColor: glowColor,
            shadowBlur: glowColor ? TILE * 0.35 : 0,
            filter: type === 'dragon' ? 'hue-rotate(-18deg) saturate(1.15) brightness(1.04)' : 'none'
        });
        return true;
    }

    function drawLeafToken(x, y) {
        if (drawCenteredSprite(spriteImages.leaf, x, y, TILE * 0.96, TILE * 0.96, -0.12)) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.2);
        ctx.fillStyle = '#8cbb3e';
        ctx.strokeStyle = '#557120';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, -TILE * 0.35);
        ctx.quadraticCurveTo(TILE * 0.32, -TILE * 0.05, 0, TILE * 0.34);
        ctx.quadraticCurveTo(-TILE * 0.32, -TILE * 0.05, 0, -TILE * 0.35);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.72)';
        ctx.beginPath();
        ctx.moveTo(0, -TILE * 0.24);
        ctx.lineTo(0, TILE * 0.2);
        ctx.stroke();
        ctx.restore();
    }

    function drawTeaCup(x, y) {
        if (drawCenteredSprite(spriteImages.cup, x, y, TILE * 1.02, TILE * 1.02)) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#f9f3e6';
        ctx.strokeStyle = '#5675a2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, TILE * 0.08, TILE * 0.24, TILE * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(TILE * 0.28, TILE * 0.06, TILE * 0.08, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.65)';
        ctx.beginPath();
        ctx.moveTo(-TILE * 0.1, -TILE * 0.25);
        ctx.quadraticCurveTo(-TILE * 0.06, -TILE * 0.4, -TILE * 0.14, -TILE * 0.5);
        ctx.moveTo(0, -TILE * 0.23);
        ctx.quadraticCurveTo(TILE * 0.05, -TILE * 0.4, -TILE * 0.02, -TILE * 0.52);
        ctx.stroke();
        ctx.restore();
    }

    function drawLotusTile(x, y) {
        if (drawCenteredSprite(spriteImages.lotus, x, y, TILE * 1.02, TILE * 1.02, 0.06)) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.18);
        ctx.fillStyle = '#ded3aa';
        ctx.strokeStyle = '#91845c';
        ctx.lineWidth = 1.5;
        roundRect(ctx, -TILE * 0.35, -TILE * 0.35, TILE * 0.7, TILE * 0.7, 5);
        ctx.fill();
        ctx.stroke();
        drawJasmineFlower(0, 0, TILE * 0.2, '#fff3d4');
        ctx.restore();
    }

    function drawJasmineToken(x, y) {
        if (drawCenteredSprite(spriteImages.jasmine, x, y, TILE * 1.02, TILE * 1.02)) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fill();
        drawJasmineFlower(0, 0, TILE * 0.22);
        ctx.restore();
    }

    function drawLotusSeed(x, y) {
        if (drawCenteredSprite(spriteImages.seed, x, y, TILE * 1.02, TILE * 1.02)) return;
        ctx.save();
        ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, TILE * 0.04, 0, 0, TILE * 0.4);
        glow.addColorStop(0, 'rgba(255, 241, 164, .92)');
        glow.addColorStop(1, 'rgba(255, 241, 164, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#93a848';
        ctx.strokeStyle = '#61762a';
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function drawTeapot(x, y) {
        if (drawCenteredSprite(spriteImages.teapot, x, y, TILE * 1.02, TILE * 1.02)) return;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#5f7450';
        ctx.strokeStyle = '#374430';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, TILE * 0.22, TILE * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-TILE * 0.12, -TILE * 0.18);
        ctx.quadraticCurveTo(0, -TILE * 0.35, TILE * 0.12, -TILE * 0.18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(TILE * 0.18, -TILE * 0.04);
        ctx.quadraticCurveTo(TILE * 0.38, -TILE * 0.16, TILE * 0.4, TILE * 0.02);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-TILE * 0.2, -TILE * 0.02, TILE * 0.08, Math.PI / 2, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
    }

    function drawDragonTea(x, y) {
        ctx.save();
        ctx.translate(x, y);
        const glow = ctx.createRadialGradient(0, 0, TILE * 0.03, 0, 0, TILE * 0.44);
        glow.addColorStop(0, 'rgba(191, 233, 176, .95)');
        glow.addColorStop(0.45, 'rgba(119, 169, 95, .55)');
        glow.addColorStop(1, 'rgba(119, 169, 95, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, TILE * 0.44, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5d9150';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-TILE * 0.14, TILE * 0.18);
        ctx.quadraticCurveTo(TILE * 0.06, TILE * 0.02, -TILE * 0.02, -TILE * 0.16);
        ctx.quadraticCurveTo(-TILE * 0.1, -TILE * 0.28, TILE * 0.1, -TILE * 0.36);
        ctx.stroke();
        ctx.restore();
    }

    function drawJasmineFlower(x, y, size, color = '#fff9ef') {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.strokeStyle = '#e1d3a8';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i += 1) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / 5) * i);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(size * 0.4, -size * 0.95, 0, -size * 1.25);
            ctx.quadraticCurveTo(-size * 0.4, -size * 0.95, 0, 0);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        ctx.fillStyle = '#e4c454';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function directionToAngle(direction) {
        if (direction.x === 1) return 0;
        if (direction.x === -1) return Math.PI;
        if (direction.y === 1) return Math.PI / 2;
        return -Math.PI / 2;
    }

    function roundRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.arcTo(x + width, y, x + width, y + height, radius);
        context.arcTo(x + width, y + height, x, y + height, radius);
        context.arcTo(x, y + height, x, y, radius);
        context.arcTo(x, y, x + width, y, radius);
        context.closePath();
    }

    function setStatus(message) {
        statusDisplay.textContent = message;
    }
})();
