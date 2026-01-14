// ----- Parámetros del tablero -----
const N = 5; // puntos 5x5 => cajas 4x4
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const size = canvas.width;
const margin = 40;
const gridSize = size - 2 * margin;
const step = gridSize / (N - 1);

const PLAYER_HUMAN = -1;
const PLAYER_AI = 1;

// ----- Estado del juego -----
function createInitialState() {
  const horizontals = Array.from({ length: N }, () =>
    Array(N - 1).fill(false)
  );
  const verticals = Array.from({ length: N - 1 }, () =>
    Array(N).fill(false)
  );
  return {
    horizontals,
    verticals,
    scoreAI: 0,
    scoreHuman: 0,
    currentPlayer: PLAYER_HUMAN, // empiezas tú
  };
}

let state = createInitialState();

// ----- Utilidades -----
function cloneState(s) {
  return {
    horizontals: s.horizontals.map(r => r.slice()),
    verticals: s.verticals.map(r => r.slice()),
    scoreAI: s.scoreAI,
    scoreHuman: s.scoreHuman,
    currentPlayer: s.currentPlayer,
  };
}

function getAvailableMoves(s) {
  const moves = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 1; c++) {
      if (!s.horizontals[r][c]) moves.push({ type: "H", row: r, col: c });
    }
  }
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N; c++) {
      if (!s.verticals[r][c]) moves.push({ type: "V", row: r, col: c });
    }
  }
  return moves;
}

function isBoxFull(s, r, c) {
  return (
    s.horizontals[r][c] &&
    s.horizontals[r + 1][c] &&
    s.verticals[r][c] &&
    s.verticals[r][c + 1]
  );
}

function boxCompleted(s, move) {
  let completed = 0;

  if (move.type === "H") {
    const r = move.row;
    const c = move.col;
    if (r > 0 && isBoxFull(s, r - 1, c)) completed++;
    if (r < N - 1 && isBoxFull(s, r, c)) completed++;
  } else {
    const r = move.row;
    const c = move.col;
    if (c > 0 && isBoxFull(s, r, c - 1)) completed++;
    if (c < N - 1 && isBoxFull(s, r, c)) completed++;
  }
  return completed;
}

function applyMove(s, move) {
  const next = cloneState(s);
  if (move.type === "H") {
    next.horizontals[move.row][move.col] = true;
  } else {
    next.verticals[move.row][move.col] = true;
  }

  const completed = boxCompleted(next, move);
  if (completed > 0) {
    if (s.currentPlayer === PLAYER_AI) next.scoreAI += completed;
    else next.scoreHuman += completed;
  } else {
    next.currentPlayer = s.currentPlayer === PLAYER_AI ? PLAYER_HUMAN : PLAYER_AI;
  }
  return next;
}

function isTerminal(s) {
  return getAvailableMoves(s).length === 0;
}

// ----- Heurística -----
function countThirdSides(s) {
  let count = 0;
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      let sides = 0;
      if (s.horizontals[r][c]) sides++;
      if (s.horizontals[r + 1][c]) sides++;
      if (s.verticals[r][c]) sides++;
      if (s.verticals[r][c + 1]) sides++;
      if (sides === 3) count++;
    }
  }
  return count;
}

function evaluate(s) {
  const scoreDiff = s.scoreAI - s.scoreHuman;
  const thirds = countThirdSides(s);
  const penaltyThirds = thirds * 2;
  return scoreDiff * 10 - penaltyThirds;
}

// ----- Minimax con poda alfa-beta -----
const MAX_DEPTH = 6; // si va lento, bájalo a 4

function minimax(s, depth, alpha, beta) {
  if (depth === 0 || isTerminal(s)) {
    return evaluate(s);
  }

  const moves = getAvailableMoves(s);

  if (s.currentPlayer === PLAYER_AI) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const next = applyMove(s, move);
      const evalVal = minimax(next, depth - 1, alpha, beta);
      if (evalVal > maxEval) maxEval = evalVal;
      if (evalVal > alpha) alpha = evalVal;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const next = applyMove(s, move);
      const evalVal = minimax(next, depth - 1, alpha, beta);
      if (evalVal < minEval) minEval = evalVal;
      if (evalVal < beta) beta = evalVal;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestMove(s) {
  const moves = getAvailableMoves(s);
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestValue = -Infinity;

  for (const move of moves) {
    const next = applyMove(s, move);
    const value = minimax(next, MAX_DEPTH, -Infinity, Infinity);
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  return bestMove;
}

// ----- Dibujo -----
function drawBoard() {
  ctx.clearRect(0, 0, size, size);

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Cajas reclamadas
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N - 1; c++) {
      const full = isBoxFull(state, r, c);
      if (full) {
        // Determinar de quién es (aprox: miramos quién tiene más puntos cercanos)
        // Simplificado: colorear azul/rojo según quién va ganando.
        const x = margin + c * step;
        const y = margin + r * step;
        const color =
          state.scoreAI > state.scoreHuman ? "rgba(255,0,0,0.25)" : "rgba(0,0,255,0.25)";
        ctx.fillStyle = color;
        ctx.fillRect(x, y, step, step);
      }
    }
  }

  // Líneas jugadas
  ctx.lineWidth = 6;
  // Horizontales
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 1; c++) {
      if (state.horizontals[r][c]) {
        const x1 = margin + c * step;
        const y1 = margin + r * step;
        const x2 = margin + (c + 1) * step;
        const y2 = y1;
        ctx.strokeStyle = "#0000ff"; // humano/IA mismo color para simplificar
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }
  // Verticales
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N; c++) {
      if (state.verticals[r][c]) {
        const x1 = margin + c * step;
        const y1 = margin + r * step;
        const x2 = x1;
        const y2 = margin + (r + 1) * step;
        ctx.strokeStyle = "#0000ff";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  // Puntos
  ctx.fillStyle = "#000000";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = margin + c * step;
      const y = margin + r * step;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Marcador
  ctx.fillStyle = "#000000";
  ctx.font = "16px system-ui";
  ctx.fillText(`Tú: ${state.scoreHuman}`, 10, 20);
  ctx.fillText(`IA: ${state.scoreAI}`, size - 100, 20);
}

function getMoveFromClick(x, y) {
  // Convertir coordenadas a la línea más cercana horizontal/vertical si está "cerca"
  let best = null;
  let bestDist = 12; // umbral de click

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 1; c++) {
      const x1 = margin + c * step;
      const y1 = margin + r * step;
      const x2 = margin + (c + 1) * step;
      const y2 = y1;
      const dist = pointToSegmentDistance(x, y, x1, y1, x2, y2);
      if (dist < bestDist && !state.horizontals[r][c]) {
        bestDist = dist;
        best = { type: "H", row: r, col: c };
      }
    }
  }

  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N; c++) {
      const x1 = margin + c * step;
      const y1 = margin + r * step;
      const x2 = x1;
      const y2 = margin + (r + 1) * step;
      const dist = pointToSegmentDistance(x, y, x1, y1, x2, y2);
      if (dist < bestDist && !state.verticals[r][c]) {
        bestDist = dist;
        best = { type: "V", row: r, col: c };
      }
    }
  }

  return best;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// ----- Manejo de clicks -----
let blocking = false; // evitar múltiples clicks mientras la IA piensa

canvas.addEventListener("click", async (e) => {
  if (blocking) return;
  if (state.currentPlayer !== PLAYER_HUMAN) return;
  if (isTerminal(state)) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const move = getMoveFromClick(x, y);
  if (!move) return;

  const oldPlayer = state.currentPlayer;
  state = applyMove(state, move);
  drawBoard();

  if (isTerminal(state)) return;
  // Si no completaste caja, turno IA
  if (state.currentPlayer === PLAYER_AI && oldPlayer !== PLAYER_AI) {
    blocking = true;
    await aiTurn();
    blocking = false;
  }
});

async function aiTurn() {
  while (state.currentPlayer === PLAYER_AI && !isTerminal(state)) {
    const best = getBestMove(state);
    if (!best) break;
    state = applyMove(state, best);
    drawBoard();
    // Si la IA completa caja, sigue jugando; si no, sale del while por cambio de turno
    if (state.currentPlayer !== PLAYER_AI) break;
    // pequeño delay visual
    await new Promise(res => setTimeout(res, 200));
  }
}

// ----- Inicio -----
drawBoard();
