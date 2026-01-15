document.addEventListener("DOMContentLoaded", () => {
  const N = 5;
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const margin = 40;
  const gridSize = size - 2 * margin;
  const step = gridSize / (N - 1);

  const PLAYER_OPPONENT = -1; // oponente humano
  const PLAYER_AI = 1;        // IA

  let state = null;
  let mode = null; // "HUMAN_FIRST" o "OPPONENT_FIRST"
  let blocking = false;
  let selectedPoint = null; // {row, col} o null

  const btnHumanFirst = document.getElementById("btnHumanFirst");
  const btnOpponentFirst = document.getElementById("btnOpponentFirst");
  const infoEl = document.getElementById("info");

  if (!canvas || !ctx || !btnHumanFirst || !btnOpponentFirst || !infoEl) {
    console.error("Faltan elementos en el DOM (id mal escrito en HTML).");
    return;
  }

  // ---------- Estado ----------
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
      scoreOpponent: 0,
      currentPlayer: PLAYER_OPPONENT,
    };
  }

  function cloneState(s) {
    return {
      horizontals: s.horizontals.map(r => r.slice()),
      verticals: s.verticals.map(r => r.slice()),
      scoreAI: s.scoreAI,
      scoreOpponent: s.scoreOpponent,
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
      else next.scoreOpponent += completed;
    } else {
      next.currentPlayer =
        s.currentPlayer === PLAYER_AI ? PLAYER_OPPONENT : PLAYER_AI;
    }
    return next;
  }

  function isTerminal(s) {
    return getAvailableMoves(s).length === 0;
  }

  // ---------- Heurística ----------
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
    const scoreDiff = s.scoreAI - s.scoreOpponent;
    const thirds = countThirdSides(s);
    const penaltyThirds = thirds * 2;
    return scoreDiff * 10 - penaltyThirds;
  }

  // ---------- Minimax + límite de tiempo ----------
  const MAX_DEPTH = 6;
  const MAX_TIME_MS = 200;

  function minimax(s, depth, alpha, beta, deadline) {
    if (depth === 0 || isTerminal(s) || performance.now() > deadline) {
      return evaluate(s);
    }
    const moves = getAvailableMoves(s);

    if (s.currentPlayer === PLAYER_AI) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const next = applyMove(s, move);
        const evalVal = minimax(next, depth - 1, alpha, beta, deadline);
        if (evalVal > maxEval) maxEval = evalVal;
        if (evalVal > alpha) alpha = evalVal;
        if (beta <= alpha || performance.now() > deadline) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const next = applyMove(s, move);
        const evalVal = minimax(next, depth - 1, alpha, beta, deadline);
        if (evalVal < minEval) minEval = evalVal;
        if (evalVal < beta) beta = evalVal;
        if (beta <= alpha || performance.now() > deadline) break;
      }
      return minEval;
    }
  }

  function getBestMove(s) {
    const moves = getAvailableMoves(s);
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestValue = -Infinity;
    const start = performance.now();
    const deadline = start + MAX_TIME_MS;

    for (let depth = 2; depth <= MAX_DEPTH; depth++) {
      if (performance.now() > deadline) break;

      for (const move of moves) {
        if (performance.now() > deadline) break;
        const next = applyMove(s, move);
        const value = minimax(next, depth, -Infinity, Infinity, deadline);
        if (value > bestValue || bestMove === null) {
          bestValue = value;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }

  // ---------- Dibujo ----------
  function drawBoard() {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    // cajas
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        if (isBoxFull(state, r, c)) {
          const x = margin + c * step;
          const y = margin + r * step;
          ctx.fillStyle = "rgba(0, 150, 255, 0.2)";
          ctx.fillRect(x, y, step, step);
        }
      }
    }

    // líneas
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#0000ff";
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N - 1; c++) {
        if (state.horizontals[r][c]) {
          const x1 = margin + c * step;
          const y1 = margin + r * step;
          const x2 = margin + (c + 1) * step;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y1);
          ctx.stroke();
        }
      }
    }
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N; c++) {
        if (state.verticals[r][c]) {
          const x1 = margin + c * step;
          const y1 = margin + r * step;
          const y2 = margin + (r + 1) * step;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1, y2);
          ctx.stroke();
        }
      }
    }

    // puntos
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

    // marcador
    ctx.fillStyle = "#000000";
    ctx.font = "16px system-ui";
    ctx.fillText(`Oponente: ${state.scoreOpponent}`, 10, 20);
    ctx.fillText(`IA: ${state.scoreAI}`, size - 120, 20);
  }

  // ---------- Selección de puntos ----------
  function getPointFromClick(x, y) {
    let best = null;
    let bestDist = 10;

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const px = margin + c * step;
        const py = margin + r * step;
        const dx = x - px;
        const dy = y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = { row: r, col: c };
        }
      }
    }
    return best;
  }

  function getMoveFromPoints(p1, p2) {
    const dr = p2.row - p1.row;
    const dc = p2.col - p1.col;

    // horizontal
    if (p1.row === p2.row && Math.abs(dc) === 1) {
      const r = p1.row;
      const c = Math.min(p1.col, p2.col);
      if (!state.horizontals[r][c]) {
        return { type: "H", row: r, col: c };
      }
    }

    // vertical
    if (p1.col === p2.col && Math.abs(dr) === 1) {
      const r = Math.min(p1.row, p2.row);
      const c = p1.col;
      if (!state.verticals[r][c]) {
        return { type: "V", row: r, col: c };
      }
    }

    return null;
  }

  // ---------- IA ----------
  async function aiTurn() {
    while (state.currentPlayer === PLAYER_AI && !isTerminal(state)) {
      const best = getBestMove(state);
      if (!best) break;
      state = applyMove(state, best);
      drawBoard();
      if (state.currentPlayer !== PLAYER_AI) break;
      await new Promise(res => setTimeout(res, 150));
    }
  }

  // ---------- Controles ----------
  btnHumanFirst.addEventListener("click", () => {
    mode = "HUMAN_FIRST";
    selectedPoint = null;
    state = createInitialState();
    state.currentPlayer = PLAYER_AI;
    infoEl.textContent = "La IA hace la primera jugada para sugerirte.";
    drawBoard();
    blocking = true;
    aiTurn().then(() => {
      blocking = false;
      state.currentPlayer = PLAYER_OPPONENT;
      infoEl.textContent = "Marca las jugadas del oponente; la IA seguirá respondiendo.";
      drawBoard();
    });
  });

  btnOpponentFirst.addEventListener("click", () => {
    mode = "OPPONENT_FIRST";
    selectedPoint = null;
    state = createInitialState();
    state.currentPlayer = PLAYER_OPPONENT;
    infoEl.textContent = "Marca las jugadas del oponente tocando dos puntos adyacentes.";
    drawBoard();
  });

  // ---------- Click en canvas ----------
  canvas.addEventListener("click", async e => {
    console.log("CLICK canvas"); // debug

    if (!state || !mode) return;
    if (blocking) return;
    if (isTerminal(state)) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const point = getPointFromClick(x, y);
    if (!point) return;

    // primer clic: selecciona punto
    if (!selectedPoint) {
      selectedPoint = point;
      return;
    }

    // segundo clic: si es mismo punto, no crear línea
    if (selectedPoint.row === point.row && selectedPoint.col === point.col) {
      selectedPoint = point;
      return;
    }

    const move = getMoveFromPoints(selectedPoint, point);
    selectedPoint = null;
    if (!move) return;

    if (state.currentPlayer !== PLAYER_OPPONENT) return;

    state = applyMove(state, move);
    drawBoard();
    if (isTerminal(state)) return;

    if (state.currentPlayer === PLAYER_AI) {
      blocking = true;
      await aiTurn();
      blocking = false;
      drawBoard();
    }
  });

  // estado inicial
  state = createInitialState();
  drawBoard();
});
