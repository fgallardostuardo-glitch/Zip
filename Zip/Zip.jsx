import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Undo2, Lightbulb, Trophy, ArrowRight, Target, Grid3X3, CheckCircle2, XCircle } from "lucide-react";

const keyOf = (cell) => `${cell.r},${cell.c}`;
const sameCell = (a, b) => a && b && a.r === b.r && a.c === b.c;
const isAdjacent = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

function serpentinePath(size, reverse = false) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) path.push({ r, c });
    } else {
      for (let c = size - 1; c >= 0; c--) path.push({ r, c });
    }
  }
  return reverse ? [...path].reverse() : path;
}

function spiralPath(size) {
  const path = [];
  let top = 0;
  let bottom = size - 1;
  let left = 0;
  let right = size - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) path.push({ r: top, c });
    top++;
    for (let r = top; r <= bottom; r++) path.push({ r, c: right });
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) path.push({ r: bottom, c });
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) path.push({ r, c: left });
      left++;
    }
  }
  return path;
}

function createLevel(name, size, solution, checkpointIndexes, difficulty) {
  return {
    name,
    size,
    solution,
    difficulty,
    checkpoints: checkpointIndexes.map((index, i) => ({ ...solution[index], label: i + 1 }))
  };
}

const LEVELS = [
  createLevel("Primer trazo", 5, serpentinePath(5), [0, 6, 12, 18, 24], "Fácil"),
  createLevel("Caracol", 5, spiralPath(5), [0, 7, 12, 18, 24], "Medio"),
  createLevel("Ruta larga", 6, serpentinePath(6), [0, 8, 15, 23, 30, 35], "Medio"),
  createLevel("Espiral cerrada", 6, spiralPath(6), [0, 10, 17, 25, 31, 35], "Difícil"),
  createLevel("De vuelta", 6, serpentinePath(6, true), [0, 6, 13, 22, 29, 35], "Difícil")
];

export default function RutaTotalGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [path, setPath] = useState([]);
  const [message, setMessage] = useState("Toca el número 1 para empezar.");
  const [hintKey, setHintKey] = useState(null);
  const [errors, setErrors] = useState(0);

  const level = LEVELS[levelIndex];
  const totalCells = level.size * level.size;

  const checkpointByKey = useMemo(() => {
    const map = new Map();
    level.checkpoints.forEach((cp) => map.set(keyOf(cp), cp.label));
    return map;
  }, [level]);

  const orderByKey = useMemo(() => {
    const map = new Map();
    path.forEach((cell, index) => map.set(keyOf(cell), index + 1));
    return map;
  }, [path]);

  const reachedCheckpoints = useMemo(() => {
    return path.reduce((count, cell) => {
      const label = checkpointByKey.get(keyOf(cell));
      return label ? Math.max(count, label) : count;
    }, 0);
  }, [path, checkpointByKey]);

  const nextCheckpoint = Math.min(reachedCheckpoints + 1, level.checkpoints.length);
  const isSolved = path.length === totalCells && reachedCheckpoints === level.checkpoints.length;
  const remaining = totalCells - path.length;

  function resetLevel() {
    setPath([]);
    setMessage("Toca el número 1 para empezar.");
    setHintKey(null);
    setErrors(0);
  }

  function undo() {
    if (path.length === 0) return;
    setPath((prev) => prev.slice(0, -1));
    setMessage("Último movimiento deshecho.");
    setHintKey(null);
  }

  function nextLevel() {
    setLevelIndex((current) => (current + 1) % LEVELS.length);
    setPath([]);
    setMessage("Nuevo tablero. Empieza por el número 1.");
    setHintKey(null);
    setErrors(0);
  }

  function showHint() {
    if (path.length === totalCells) return;
    const followsGuide = path.every((cell, index) => sameCell(cell, level.solution[index]));

    if (!followsGuide) {
      setMessage("Tu ruta se desvió del camino guía. Retrocede o reinicia para usar pista.");
      setHintKey(null);
      return;
    }

    const nextCell = level.solution[path.length];
    if (nextCell) {
      setHintKey(keyOf(nextCell));
      setMessage("Pista marcada: esa casilla mantiene una solución válida.");
    }
  }

  function registerError(text) {
    setErrors((value) => value + 1);
    setMessage(text);
    setHintKey(null);
  }

  function handleCellClick(cell) {
    if (isSolved) return;

    const cellKey = keyOf(cell);
    const checkpointLabel = checkpointByKey.get(cellKey);
    const last = path[path.length - 1];
    const previous = path[path.length - 2];
    const alreadyVisited = orderByKey.has(cellKey);

    if (path.length === 0) {
      if (checkpointLabel !== 1) {
        registerError("Debes comenzar en el número 1. Sin atajos, Señor Gallardo.");
        return;
      }
      setPath([cell]);
      setMessage("Bien. Ahora construye una ruta continua hacia el siguiente número.");
      setHintKey(null);
      return;
    }

    if (previous && sameCell(cell, previous)) {
      undo();
      return;
    }

    if (sameCell(cell, last)) return;

    if (alreadyVisited) {
      registerError("No puedes cruzar una casilla ya usada. La ruta debe ser única.");
      return;
    }

    if (!isAdjacent(last, cell)) {
      registerError("Movimiento inválido: solo puedes avanzar a una casilla vecina.");
      return;
    }

    if (checkpointLabel && checkpointLabel !== reachedCheckpoints + 1) {
      registerError(`Ese número no toca todavía. El siguiente objetivo es el ${reachedCheckpoints + 1}.`);
      return;
    }

    const nextPath = [...path, cell];
    setPath(nextPath);
    setHintKey(null);

    const nextReached = checkpointLabel ? checkpointLabel : reachedCheckpoints;
    if (nextPath.length === totalCells && nextReached === level.checkpoints.length) {
      setMessage("Tablero resuelto. Camino completo, números en orden y sin casillas libres.");
    } else if (checkpointLabel) {
      setMessage(`Correcto: llegaste al ${checkpointLabel}. Ahora busca el ${checkpointLabel + 1}.`);
    } else if (remaining - 1 <= 3) {
      setMessage("Cuidado con el cierre: no dejes una isla imposible de completar.");
    } else {
      setMessage("Sigue. El tablero castiga la improvisación más que el error.");
    }
  }

  const boardCells = [];
  for (let r = 0; r < level.size; r++) {
    for (let c = 0; c < level.size; c++) boardCells.push({ r, c });
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid gap-5 lg:grid-cols-[1fr_340px]">
        <main className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 text-cyan-200 border border-cyan-300/20 px-3 py-1 text-xs font-semibold mb-3">
                <Grid3X3 size={14} /> Juego lógico original
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Ruta Total</h1>
              <p className="text-slate-300 mt-2 max-w-xl">
                Dibuja un camino continuo, pasa por los números en orden y ocupa toda la grilla.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-3 min-w-[180px]">
              <div className="text-xs uppercase tracking-widest text-slate-400">Nivel</div>
              <div className="text-lg font-bold">{level.name}</div>
              <div className="text-sm text-cyan-200">{level.difficulty}</div>
            </div>
          </div>

          <section className="flex justify-center py-2">
            <div
              className="grid gap-2 rounded-3xl bg-slate-900 p-3 sm:p-4 border border-white/10 shadow-inner"
              style={{ gridTemplateColumns: `repeat(${level.size}, minmax(44px, 68px))` }}
            >
              {boardCells.map((cell) => {
                const cellKey = keyOf(cell);
                const checkpoint = checkpointByKey.get(cellKey);
                const order = orderByKey.get(cellKey);
                const isCurrent = path.length > 0 && sameCell(path[path.length - 1], cell);
                const isHint = hintKey === cellKey;

                return (
                  <motion.button
                    key={cellKey}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleCellClick(cell)}
                    className={[
                      "relative aspect-square rounded-2xl border text-lg sm:text-xl font-black transition-all select-none",
                      order
                        ? "bg-cyan-400 text-slate-950 border-cyan-200 shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800 text-slate-200 border-white/10 hover:bg-slate-700",
                      isCurrent ? "ring-4 ring-white/70" : "",
                      isHint ? "ring-4 ring-amber-300 bg-amber-200 text-slate-950" : ""
                    ].join(" ")}
                    aria-label={`Fila ${cell.r + 1}, columna ${cell.c + 1}`}
                  >
                    {checkpoint ? (
                      <span className="relative z-10 flex h-full w-full items-center justify-center">
                        {checkpoint}
                      </span>
                    ) : order ? (
                      <span className="relative z-10 text-xs sm:text-sm opacity-70">{order}</span>
                    ) : null}

                    {order && !checkpoint && (
                      <span className="absolute inset-2 rounded-xl border border-slate-950/20" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl p-5 flex flex-col gap-4">
          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4">
            <div className="flex items-start gap-3">
              {isSolved ? <Trophy className="text-amber-300 shrink-0" /> : <Target className="text-cyan-300 shrink-0" />}
              <div>
                <div className="text-sm uppercase tracking-widest text-slate-400">Estado</div>
                <p className="font-semibold leading-snug mt-1">{message}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4">
              <div className="text-xs text-slate-400">Casillas usadas</div>
              <div className="text-2xl font-black">{path.length}/{totalCells}</div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4">
              <div className="text-xs text-slate-400">Restantes</div>
              <div className="text-2xl font-black">{remaining}</div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4">
              <div className="text-xs text-slate-400">Siguiente número</div>
              <div className="text-2xl font-black">{isSolved ? "—" : nextCheckpoint}</div>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4">
              <div className="text-xs text-slate-400">Errores</div>
              <div className="text-2xl font-black">{errors}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={undo}
              className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 font-bold flex items-center justify-center gap-2"
            >
              <Undo2 size={18} /> Deshacer
            </button>
            <button
              onClick={resetLevel}
              className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Reiniciar
            </button>
            <button
              onClick={showHint}
              className="rounded-2xl bg-amber-300 text-slate-950 hover:bg-amber-200 px-4 py-3 font-black flex items-center justify-center gap-2"
            >
              <Lightbulb size={18} /> Pista
            </button>
            <button
              onClick={nextLevel}
              className="rounded-2xl bg-cyan-300 text-slate-950 hover:bg-cyan-200 px-4 py-3 font-black flex items-center justify-center gap-2"
            >
              Siguiente nivel <ArrowRight size={18} />
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-4 text-sm text-slate-300 space-y-3">
            <div className="flex gap-2">
              <CheckCircle2 className="text-emerald-300 shrink-0" size={18} />
              <p>Objetivo: llenar todas las casillas con un solo camino.</p>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="text-emerald-300 shrink-0" size={18} />
              <p>Debes pasar por los números en orden ascendente.</p>
            </div>
            <div className="flex gap-2">
              <XCircle className="text-rose-300 shrink-0" size={18} />
              <p>No puedes saltar, cruzarte ni tocar un número futuro antes de tiempo.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
