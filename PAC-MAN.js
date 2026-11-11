
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 24;
const COLS = 21;
const ROWS = 21;

canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

// Criando o labirinto
let map;
let pacman;
let ghosts;
let score;
let lives;
let remaining;
let gameOver;
let won;
let tick;

const directions = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
};

function createMap() {
    let grid = Array.from(
        { length: ROWS },
        () => Array(COLS).fill(".")
    );

    // Paredes externas
    for (let x = 0; x < COLS; x++) {
        grid[0][x] = "#";
        grid[ROWS - 1][x] = "#";
    }

    for (let y = 0; y < ROWS; y++) {
        grid[y][0] = "#";
        grid[y][COLS - 1] = "#";
    }

    // Paredes internas
    const walls = [
        [4, 2, 8], [4, 12, 18],
        [8, 2, 6], [8, 14, 18],
        [12, 2, 8], [12, 12, 18],
        [16, 2, 6], [16, 14, 18]
    ];

    walls.forEach(([y, start, end]) => {
        for (let x = start; x <= end; x++) {
            grid[y][x] = "#";
        }
    });

    // Espaço para o jogador
    grid[1][1] = " ";

    // Espaços dos fantasmas
    grid[1][19] = " ";
    grid[19][1] = " ";
    grid[19][19] = " ";
    grid[19][10] = " ";

    // Pontos especiais
    grid[1][19] = "o";
    grid[19][1] = "o";
    grid[19][19] = "o";

    return grid;
}

function resetGame() {
    map = createMap();

    pacman = {
        x: 1,
        y: 1,
        dir: { x: 0, y: 0 },
        nextDir: { x: 0, y: 0 },
        mouth: 0
    };

    ghosts = [
        { x: 19, y: 1, color: "#ff3030" },
        { x: 1, y: 19, color: "#ff70cb" },
        { x: 19, y: 19, color: "#00e5ff" }
    ];

    score = 0;
    lives = 3;
    remaining = 0;
    gameOver = false;
    won = false;
    tick = 0;

    // Conta os pontos disponíveis
    map.forEach(row => {
        row.forEach(cell => {
            if (cell === "." || cell === "o") {
                remaining++;
            }
        });
    });

    document.getElementById("message-title").textContent = "PAC-MAN";
    document.getElementById("message-text").textContent =
        "Colete todos os pontos e fuja dos fantasmas!";

    updateInfo();
    draw();
}

function isWall(x, y) {
    return (
        x < 0 ||
        y < 0 ||
        x >= COLS ||
        y >= ROWS ||
        map[y][x] === "#"
    );
}

// Movimentação do Pac-Man
function movePacman() {
    let nx = pacman.x + pacman.nextDir.x;
    let ny = pacman.y + pacman.nextDir.y;

    if (!isWall(nx, ny)) {
        pacman.dir = { ...pacman.nextDir };
    }

    nx = pacman.x + pacman.dir.x;
    ny = pacman.y + pacman.dir.y;

    if (!isWall(nx, ny)) {
        pacman.x = nx;
        pacman.y = ny;
    }

    // Coletando pontos
    if (map[pacman.y][pacman.x] === ".") {
        map[pacman.y][pacman.x] = " ";
        score += 10;
        remaining--;
    }

    // Ponto especial
    else if (map[pacman.y][pacman.x] === "o") {
        map[pacman.y][pacman.x] = " ";
        score += 50;
        remaining--;
    }

    pacman.mouth += 0.3;

    if (remaining <= 0) {
        finishGame(true);
    }
}

// Caminho dos fantasmas usando busca em largura
function getNextStep(ghost) {
    const queue = [{
        x: ghost.x,
        y: ghost.y,
        first: null
    }];

    const visited = new Set();
    visited.add(`${ghost.x},${ghost.y}`);

    const dirs = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
    ];

    while (queue.length > 0) {
        const current = queue.shift();

        if (
            current.x === pacman.x &&
            current.y === pacman.y
        ) {
            return current.first;
        }

        for (const dir of dirs) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            const key = `${nx},${ny}`;

            if (!isWall(nx, ny) && !visited.has(key)) {
                visited.add(key);

                queue.push({
                    x: nx,
                    y: ny,
                    first: current.first || { x: nx, y: ny }
                });
            }
        }
    }

    return null;
}

// Movimentação dos fantasmas
function moveGhosts() {
    ghosts.forEach(ghost => {
        const next = getNextStep(ghost);

        if (next) {
            ghost.x = next.x;
            ghost.y = next.y;
        }
    });
}

// Verifica colisões
function checkCollision() {
    for (const ghost of ghosts) {
        if (
            ghost.x === pacman.x &&
            ghost.y === pacman.y
        ) {
            lives--;

            updateInfo();

            if (lives <= 0) {
                finishGame(false);
            } else {
                pacman.x = 1;
                pacman.y = 1;
                pacman.dir = { x: 0, y: 0 };
                pacman.nextDir = { x: 0, y: 0 };

                ghosts = [
                    { x: 19, y: 1, color: "#ff3030" },
                    { x: 1, y: 19, color: "#ff70cb" },
                    { x: 19, y: 19, color: "#00e5ff" }
                ];
            }

            return;
        }
    }
}

function updateInfo() {
    document.getElementById("score").textContent = score;
    document.getElementById("lives").textContent = lives;
}

// Desenhando o labirinto
function drawMap() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const px = x * TILE;
            const py = y * TILE;

            if (map[y][x] === "#") {
                ctx.fillStyle = "#1027bd";
                ctx.fillRect(px, py, TILE, TILE);

                ctx.strokeStyle = "#354fff";
                ctx.lineWidth = 1;
                ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
            }

            else if (map[y][x] === ".") {
                ctx.fillStyle = "#ffe6a0";
                ctx.beginPath();
                ctx.arc(
                    px + TILE / 2,
                    py + TILE / 2,
                    3,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }

            else if (map[y][x] === "o") {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(
                    px + TILE / 2,
                    py + TILE / 2,
                    7,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    }
}

// Desenhando Pac-Man
function drawPacman() {
    const x = pacman.x * TILE + TILE / 2;
    const y = pacman.y * TILE + TILE / 2;

    const angle = Math.atan2(
        pacman.dir.y,
        pacman.dir.x
    );

    const mouth = Math.abs(Math.sin(pacman.mouth)) * 0.35;

    ctx.fillStyle = "#ffe600";
    ctx.beginPath();

    ctx.moveTo(x, y);
    ctx.arc(
        x,
        y,
        TILE / 2 - 2,
        angle + mouth,
        angle + Math.PI * 2 - mouth
    );

    ctx.closePath();
    ctx.fill();
}

// Desenhando fantasmas
function drawGhosts() {
    ghosts.forEach(ghost => {
        const x = ghost.x * TILE + TILE / 2;
        const y = ghost.y * TILE + TILE / 2;

        ctx.fillStyle = ghost.color;

        ctx.beginPath();
        ctx.arc(x, y - 2, 10, Math.PI, 0);
        ctx.lineTo(x + 10, y + 9);
        ctx.lineTo(x + 5, y + 6);
        ctx.lineTo(x, y + 9);
        ctx.lineTo(x - 5, y + 6);
        ctx.lineTo(x - 10, y + 9);
        ctx.closePath();
        ctx.fill();

        // Olhos
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(x - 4, y - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(x + 4, y - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Desenhar tudo
function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMap();
    drawPacman();
    drawGhosts();
}

// Final da partida
function finishGame(victory) {
    gameOver = true;
    won = victory;

    document.getElementById("message-title").textContent =
        victory ? "VOCÊ VENCEU!" : "GAME OVER";

    document.getElementById("message-text").textContent =
        victory
            ? "Parabéns! Você coletou todos os pontos!"
            : "Os fantasmas pegaram você! Tente novamente.";
}

// Loop principal
function gameLoop() {
    if (gameOver) return;

    movePacman();

    tick++;

    if (tick % 2 === 0) {
        moveGhosts();
    }

    checkCollision();

    updateInfo();
    draw();

    if (!gameOver) {
        setTimeout(gameLoop, 140);
    }
}

// Controles do teclado
document.addEventListener("keydown", event => {
    const key = event.key.length === 1
        ? event.key.toLowerCase()
        : event.key;

    if (directions[key]) {
        event.preventDefault();
        pacman.nextDir = directions[key];
    }
});

// Reiniciar
document.getElementById("restart").addEventListener("click", () => {
    resetGame();
    gameLoop();
});

// Iniciar jogo
resetGame();
gameLoop();
