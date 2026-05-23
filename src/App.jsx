import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ZorroGallinaPrototype() {
  const tableroRef = useRef(null);
  const arrastreOrigenRef = useRef(null);
  const [turn, setTurn] = useState("gallinas");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("Selecciona una gallina para moverla.");
  const [winner, setWinner] = useState(null);
  const [sopladoAlert, setSopladoAlert] = useState(null);
  const [warningOneFox, setWarningOneFox] = useState(false);
  const [forcedPreview, setForcedPreview] = useState(null);
  const [capturingFox, setCapturingFox] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const crearSonido = (tipo) => {
    if (!soundEnabled) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();

    const presets = {
      mover: { frecuencia: 420, duracion: 0.09, tipo: "sine", volumen: 0.05 },
      comer: { frecuencia: 180, duracion: 0.18, tipo: "sawtooth", volumen: 0.08 },
      soplado: { frecuencia: 90, duracion: 0.32, tipo: "triangle", volumen: 0.1 },
      victoria: { frecuencia: 660, duracion: 0.42, tipo: "square", volumen: 0.07 },
    };

    const config = presets[tipo] || presets.mover;
    osc.type = config.tipo;
    osc.frequency.setValueAtTime(config.frecuencia, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(config.frecuencia * 1.7, ctx.currentTime + config.duracion);
    gain.gain.setValueAtTime(config.volumen, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duracion);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + config.duracion);
  };

  const activarSonidos = () => {
    setSoundEnabled(true);
    setTimeout(() => crearSonido("mover"), 0);
    setMessage("Sonidos activados. Ahora escucharás movimientos, capturas, zorro soplado y victoria.");
  };

  const nodes = useMemo(() => {
    const result = [];
    let id = 1;

    for (let row = 0; row <= 6; row++) {
      for (let col = 0; col <= 6; col++) {
        const exists = (row >= 2 && row <= 4) || (col >= 2 && col <= 4);
        if (!exists) continue;

        result.push({
          id,
          row,
          col,
          x: 12 + col * 12.7,
          y: 8 + row * 13.6,
        });
        id++;
      }
    }

    return result;
  }, []);

  const idByCell = useMemo(() => {
    const map = {};
    nodes.forEach((n) => {
      map[`${n.col},${n.row}`] = n.id;
    });
    return map;
  }, [nodes]);

  const cell = (col, row) => idByCell[`${col},${row}`];

  const farmCells = useMemo(() => [
    cell(2, 0), cell(3, 0), cell(4, 0),
    cell(2, 1), cell(3, 1), cell(4, 1),
    cell(2, 2), cell(3, 2), cell(4, 2),
  ].filter(Boolean), [idByCell]);

  const lines = useMemo(() => {
    const result = [];
    const add = (a, b) => {
      if (!a || !b) return;
      const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (!result.some((l) => l.key === key)) result.push({ key, a, b });
    };

    nodes.forEach((n) => {
      add(n.id, cell(n.col + 1, n.row));
      add(n.id, cell(n.col, n.row + 1));
    });

    const xBlocks = [
      { center: [3, 1], corners: [[2, 0], [4, 0], [2, 2], [4, 2]] },
      { center: [1, 3], corners: [[0, 2], [2, 2], [0, 4], [2, 4]] },
      { center: [3, 3], corners: [[2, 2], [4, 2], [2, 4], [4, 4]] },
      { center: [5, 3], corners: [[4, 2], [6, 2], [4, 4], [6, 4]] },
      { center: [3, 5], corners: [[2, 4], [4, 4], [2, 6], [4, 6]] },
    ];

    xBlocks.forEach((block) => {
      const centerId = cell(block.center[0], block.center[1]);
      block.corners.forEach(([col, row]) => add(centerId, cell(col, row)));
    });

    return result;
  }, [nodes, idByCell]);

  const nodeById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const connections = useMemo(() => {
    const map = {};
    nodes.forEach((n) => { map[n.id] = []; });
    lines.forEach(({ a, b }) => {
      map[a].push(b);
      map[b].push(a);
    });
    return map;
  }, [nodes, lines]);

  const initialFoxes = [cell(2, 2), cell(4, 2)].filter(Boolean);
  const initialHens = [
    cell(0, 3), cell(1, 3), cell(2, 3), cell(3, 3), cell(4, 3), cell(5, 3), cell(6, 3),
    cell(0, 4), cell(1, 4), cell(2, 4), cell(3, 4), cell(4, 4), cell(5, 4), cell(6, 4),
    cell(2, 5), cell(3, 5), cell(4, 5),
    cell(2, 6), cell(3, 6), cell(4, 6),
  ].filter(Boolean);

  const [hens, setHens] = useState(initialHens);
  const [foxes, setFoxes] = useState(initialFoxes);
  const [hensEaten, setHensEaten] = useState(0);
  const [movimientos, setMovimientos] = useState([]);
  const [rachaZorro, setRachaZorro] = useState(0);
  const [rachaGallinas, setRachaGallinas] = useState(0);
  const [mostrarAyudaZorro, setMostrarAyudaZorro] = useState(true);
  const [mostrarAyudaGallinas, setMostrarAyudaGallinas] = useState(true);
  const [partidasJugadas, setPartidasJugadas] = useState(1);

  const pieceAt = (id) => {
    if (foxes.includes(id)) return "zorro";
    if (hens.includes(id)) return "gallina";
    return null;
  };

  const isOccupied = (id) => hens.includes(id) || foxes.includes(id);

  const isOccupiedInState = (id, hensList = hens, foxesList = foxes) => hensList.includes(id) || foxesList.includes(id);

  const getFoxJump = (from, over, hensList = hens, foxesList = foxes) => {
    const A = nodeById[from];
    const B = nodeById[over];
    if (!A || !B) return null;

    const landingCol = B.col + (B.col - A.col);
    const landingRow = B.row + (B.row - A.row);
    const landing = cell(landingCol, landingRow);

    if (!landing) return null;
    if (!connections[over]?.includes(landing)) return null;
    if (isOccupiedInState(landing, hensList, foxesList)) return null;

    return landing;
  };

  const getCaptureMovesForFox = (foxId, hensList = hens, foxesList = foxes) => {
    return connections[foxId]
      .filter((over) => hensList.includes(over))
      .map((over) => {
        const landing = getFoxJump(foxId, over, hensList, foxesList);
        return landing ? { type: "capture", to: landing, over } : null;
      })
      .filter(Boolean);
  };

  const getValidMoves = (id) => {
    const piece = pieceAt(id);
    if (!piece || winner || forcedPreview) return [];

    if (piece === "gallina") {
      return connections[id]
        .filter((to) => {
          const fromNode = nodeById[id];
          const toNode = nodeById[to];
          const isForward = toNode.row <= fromNode.row;
          return !isOccupied(to) && isForward;
        })
        .map((to) => ({ type: "move", to }));
    }

    if (piece === "zorro") {
      const jumps = getCaptureMovesForFox(id);

      if (capturingFox && capturingFox !== id) return [];
      if (capturingFox === id) return jumps;

      const normalMoves = connections[id]
        .filter((to) => !isOccupied(to))
        .map((to) => ({ type: "move", to }));
      return [...jumps, ...normalMoves];
    }

    return [];
  };

  const selectedMoves = selected ? getValidMoves(selected) : [];
  const selectedPieceForHelp = selected ? pieceAt(selected) : null;
  const validTargetIds =
    (selectedPieceForHelp === "zorro" && !mostrarAyudaZorro) ||
    (selectedPieceForHelp === "gallina" && !mostrarAyudaGallinas)
      ? []
      : selectedMoves.map((m) => m.to);

  const obtenerNodoCercanoDesdePunto = (punto) => {
    const tablero = tableroRef.current;
    if (!tablero) return null;

    const rect = tablero.getBoundingClientRect();
    const x = ((punto.x - rect.left) / rect.width) * 100;
    const y = ((punto.y - rect.top) / rect.height) * 100;

    let nodoMasCercano = null;
    let distanciaMasCorta = Infinity;

    nodes.forEach((nodo) => {
      const distancia = Math.hypot(nodo.x - x, nodo.y - y);
      if (distancia < distanciaMasCorta) {
        distanciaMasCorta = distancia;
        nodoMasCercano = nodo.id;
      }
    });

    return distanciaMasCorta <= 8.5 ? nodoMasCercano : null;
  };

  const puedeArrastrarFicha = (id) => {
    const ficha = pieceAt(id);
    if (!ficha || winner || forcedPreview) return false;
    if (capturingFox && id !== capturingFox) return false;
    if (turn === "gallinas" && ficha !== "gallina") return false;
    if (turn === "zorros" && ficha !== "zorro") return false;
    return true;
  };

  const iniciarArrastre = (id) => {
    if (!puedeArrastrarFicha(id)) return;
    arrastreOrigenRef.current = id;
    setSelected(id);
    setMessage("Arrastra la ficha hasta una posición válida.");
  };

  const terminarArrastre = (info) => {
    const origen = arrastreOrigenRef.current;
    arrastreOrigenRef.current = null;
    if (!origen) return;

    const destino = obtenerNodoCercanoDesdePunto(info.point);
    if (!destino || destino === origen) {
      setSelected(null);
      setMessage("Movimiento cancelado.");
      return;
    }

    selectOrMove(destino, origen);
  };

  const checkGallinaVictory = (nextHens) => {
    const hensInFarm = nextHens.filter((pos) => farmCells.includes(pos)).length;
    if (hensInFarm >= 9) {
      setWinner("gallinas");
      crearSonido("victoria");
      setMessage("¡Las gallinas ganaron! Llenaron la granja.");
      return true;
    }
    return false;
  };

  const checkFoxVictory = (nextEaten) => {
    if (nextEaten >= 12) {
      setWinner("zorros");
      crearSonido("victoria");
      setMessage("¡Los zorros ganaron! Se comieron 12 gallinas.");
      return true;
    }
    return false;
  };

  const checkZorrosAtrapados = (nextFoxes = foxes, nextHens = hens) => {
    if (winner || nextFoxes.length === 0) return false;

    const algunMovimientoDisponible = nextFoxes.some((zorroId) => {
      const capturas = getCaptureMovesForFox(zorroId, nextHens, nextFoxes);
      const movimientosNormales = connections[zorroId]?.filter((to) => !isOccupiedInState(to, nextHens, nextFoxes)) || [];
      return capturas.length > 0 || movimientosNormales.length > 0;
    });

    if (!algunMovimientoDisponible) {
      setWinner("gallinas");
      crearSonido("victoria");
      setMessage("¡Las gallinas ganaron! Los zorros quedaron atrapados sin movimientos.");
      return true;
    }

    return false;
  };

  const soplarFox = (captureInfo) => {
    setForcedPreview(captureInfo);
    setMessage("El zorro tenía una captura obligatoria. Mira el movimiento que debía hacer...");

    setTimeout(() => {
      setFoxes((prev) => {
        const nextFoxes = prev.filter((pos) => pos !== captureInfo.fox);

        if (nextFoxes.length === 1) {
          setWarningOneFox(true);
          setMessage("Advertencia: te queda un solo zorro. Si lo pierdes, perderás la partida.");
        }

        if (nextFoxes.length === 0) {
          setWinner("gallinas");
          crearSonido("victoria");
          setMessage("¡Las gallinas ganaron! Los dos zorros quedaron soplados.");
        } else {
          setTimeout(() => checkZorrosAtrapados(nextFoxes, hens), 50);
        }

        return nextFoxes;
      });

      crearSonido("soplado");
      setSopladoAlert("¡ZORRO SOPLADO!");
      setForcedPreview(null);
      setSelected(null);
      setTurn("gallinas");
    }, 1700);
  };

  const selectOrMove = (id, selectedOverride = null) => {
    if (winner || forcedPreview) return;
    const piece = pieceAt(id);
    const currentSelected = selectedOverride ?? selected;
    const currentSelectedMoves = currentSelected ? getValidMoves(currentSelected) : [];

    if (!currentSelected) {
      if (!piece) return setMessage("Primero selecciona una ficha.");
      if (capturingFox && id !== capturingFox) return setMessage("Ese zorro debe seguir comiendo si tiene otra captura consecutiva.");
      if (turn === "gallinas" && piece !== "gallina") return setMessage("Es turno de las gallinas.");
      if (turn === "zorros" && piece !== "zorro") return setMessage("Es turno de los zorros.");
      setSelected(id);
      setMessage("Ficha seleccionada. Toca una posición verde.");
      return;
    }

    if (currentSelected === id) {
      setSelected(null);
      setMessage("Selección cancelada.");
      return;
    }

    const move = currentSelectedMoves.find((m) => m.to === id);

    if (!move) {
      if (piece && ((turn === "gallinas" && piece === "gallina") || (turn === "zorros" && piece === "zorro"))) {
        setSelected(id);
        setMessage("Cambiaste la ficha seleccionada.");
      } else {
        setMessage("Movimiento no válido según las líneas reales del tablero.");
      }
      return;
    }

    const selectedPiece = pieceAt(currentSelected);

    if (selectedPiece === "gallina") {
      const nextHens = hens.map((pos) => (pos === currentSelected ? id : pos));
      setHens(nextHens);
      setMovimientos((prev) => [`🐔 Gallina: ${currentSelected} → ${id}`, ...prev].slice(0, 8));
      setSelected(null);
      setCapturingFox(null);
      setRachaZorro(0);
      setRachaGallinas((prev) => prev + 1);
      crearSonido("mover");
      if (checkGallinaVictory(nextHens)) return;
      if (checkZorrosAtrapados(foxes, nextHens)) return;
      setTurn("zorros");
      setMessage("Gallina movida. Ahora juegan los zorros.");
    }

    if (selectedPiece === "zorro") {
      const forcedCaptures = foxes.flatMap((fox) => getCaptureMovesForFox(fox).map((m) => ({ ...m, fox })));
      const selectedFoxCapture = forcedCaptures.find((m) => m.fox === currentSelected);
      const captureToShow = selectedFoxCapture || forcedCaptures[0];

      if (forcedCaptures.length > 0 && move.type !== "capture") {
        soplarFox(captureToShow);
        return;
      }

      const nextFoxes = foxes.map((pos) => (pos === currentSelected ? id : pos));

      if (move.type === "capture") {
        const nextHens = hens.filter((pos) => pos !== move.over);
        const nextEaten = hensEaten + 1;
        setFoxes(nextFoxes);
        setHens(nextHens);
        setHensEaten(nextEaten);
        setRachaZorro((prev) => prev + 1);
        setRachaGallinas(0);
        setMovimientos((prev) => [`🦊 Zorro comió en ${id}`, ...prev].slice(0, 8));
        crearSonido("comer");

        if (checkFoxVictory(nextEaten)) {
          setSelected(null);
          setCapturingFox(null);
          return;
        }

        const siguientesCapturas = getCaptureMovesForFox(id, nextHens, nextFoxes);

        if (siguientesCapturas.length > 0) {
          setCapturingFox(id);
          setSelected(id);
          setTurn("zorros");
          setMessage("¡El zorro comió una gallina y puede seguir comiendo! Toca otra posición verde con el mismo zorro.");
          return;
        }

        setCapturingFox(null);
        setTurn("gallinas");
        setSelected(null);
        setMessage("¡El zorro se comió una gallina! Ahora juegan las gallinas.");
      } else {
        setFoxes(nextFoxes);
        setMovimientos((prev) => [`🦊 Zorro: ${currentSelected} → ${id}`, ...prev].slice(0, 8));
        setCapturingFox(null);
        setRachaZorro(0);
        setRachaGallinas(0);
        crearSonido("mover");
        setTurn("gallinas");
        setSelected(null);
        setMessage("Zorro movido. Ahora juegan las gallinas.");
      }
    }
  };

  const resetGame = () => {
    setTurn("gallinas");
    setSelected(null);
    setWinner(null);
    setSopladoAlert(null);
    setWarningOneFox(false);
    setForcedPreview(null);
    setCapturingFox(null);
    setMessage("Juego reiniciado. Selecciona una gallina para moverla.");
    setMovimientos([]);
    setRachaZorro(0);
    setRachaGallinas(0);
    setPartidasJugadas((prev) => prev + 1);
    setHens(initialHens);
    setFoxes(initialFoxes);
    setHensEaten(0);
  };

  const hensInFarm = hens.filter((pos) => farmCells.includes(pos)).length;
  const gallinasRestantes = hens.length;

  const PreviewPath = () => {
    if (!forcedPreview) return null;
    const A = nodeById[forcedPreview.fox];
    const B = nodeById[forcedPreview.over];
    const C = nodeById[forcedPreview.to];
    if (!A || !B || !C) return null;

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40" viewBox="0 0 100 100" preserveAspectRatio="none">
        <motion.line
          x1={A.x} y1={A.y} x2={C.x} y2={C.y}
          stroke="#b8ff36" strokeWidth="1.4" strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7 }}
          style={{ filter: "drop-shadow(0 0 7px #b8ff36)" }}
        />
        <motion.circle cx={B.x} cy={B.y} r="4.6" fill="none" stroke="#ff3232" strokeWidth="1.15" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1.2, opacity: 1 }} transition={{ repeat: Infinity, duration: 0.45, repeatType: "reverse" }} />
        <motion.circle cx={C.x} cy={C.y} r="4" fill="none" stroke="#b8ff36" strokeWidth="1.15" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1.35, opacity: 1 }} transition={{ repeat: Infinity, duration: 0.5, repeatType: "reverse" }} />
      </svg>
    );
  };

  return (
    <div className="h-[100dvh] sm:min-h-screen relative bg-[#100905] text-white flex items-start sm:items-center justify-center p-2 sm:p-5 overflow-hidden sm:overflow-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_5%,rgba(255,173,64,.24),transparent_34%),radial-gradient(circle_at_85%_85%,rgba(99,255,68,.12),transparent_25%),linear-gradient(135deg,#1b0f08_0%,#080504_100%)]" />
      <div className="absolute inset-0 opacity-[.18] bg-[linear-gradient(90deg,rgba(255,255,255,.13)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.13)_1px,transparent_1px)] bg-[length:38px_38px]" />
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-lime-400/10 blur-3xl" />

      <AnimatePresence>
        {sopladoAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.68, y: -36 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onAnimationComplete={() => setTimeout(() => setSopladoAlert(null), 1300)}
            className="fixed z-50 top-7 left-1/2 -translate-x-1/2 rounded-[2rem] bg-red-600 text-white px-8 py-5 font-black text-2xl sm:text-3xl shadow-[0_0_45px_rgba(255,40,40,.75)] border-4 border-yellow-300"
          >
            💨 {sopladoAlert}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative w-full h-full sm:h-auto max-w-7xl grid grid-rows-[auto_1fr] xl:grid-rows-1 xl:grid-cols-[1fr_360px] gap-2 sm:gap-5 items-start sm:items-center">
        <section className="rounded-[1.5rem] sm:rounded-[2rem] bg-[#22130b]/75 border border-amber-500/25 shadow-[0_25px_90px_rgba(0,0,0,.65)] p-2 sm:p-6 backdrop-blur-xl">
          <div className="flex justify-between items-start mb-2 sm:mb-4 gap-3">
            <div>
              <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-lime-300/10 border border-lime-200/20 px-3 py-1 text-xs text-lime-100 mb-2">
                <span className="w-2 h-2 rounded-full bg-lime-300 shadow-[0_0_10px_#bef264]" />
                Prototipo jugable
              </div>
              <h1 className="text-lg sm:text-5xl font-black tracking-tight leading-tight">El Zorro y la Gallina</h1>
              <p className="hidden sm:block text-amber-100/70 text-sm sm:text-base mt-1">Tablero iluminado, granja, captura obligatoria y zorro soplado.</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-amber-500/15 border border-amber-300/30 text-amber-100 text-sm whitespace-nowrap shadow-inner">
              Turno: <b className="capitalize">{winner ? "fin" : turn}</b>
            </div>
          </div>

          <div ref={tableroRef} className="relative mx-auto aspect-square w-full max-w-[min(96vw,58dvh)] sm:max-w-[790px] rounded-[1.5rem] sm:rounded-[2rem] bg-[#2b190f] shadow-[inset_0_0_60px_rgba(0,0,0,.75),0_25px_70px_rgba(0,0,0,.5)] overflow-hidden border border-amber-700/40 touch-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#8b5226_0%,#3b2114_54%,#140b06_100%)]" />
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgba(0,0,0,.32)_72%)]" />

            <div className="absolute inset-[6%]">
              <div className="absolute left-[30%] top-0 w-[40%] h-full rounded-[1.5rem] bg-gradient-to-b from-[#e6a24d] via-[#c9792f] to-[#7d401d] shadow-[inset_0_0_30px_rgba(255,255,255,.18),0_12px_40px_rgba(0,0,0,.45)] border-4 border-[#4d2b18]" />
              <div className="absolute left-0 top-[30%] w-full h-[40%] rounded-[1.5rem] bg-gradient-to-b from-[#e6a24d] via-[#c9792f] to-[#7d401d] shadow-[inset_0_0_30px_rgba(255,255,255,.18),0_12px_40px_rgba(0,0,0,.45)] border-4 border-[#4d2b18]" />
              <div className="absolute left-[30%] top-0 w-[40%] h-[30%] rounded-t-[1.5rem] bg-lime-400/10 border border-lime-200/15" />
            </div>

            <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              {lines.map(({ key, a, b }) => {
                const A = nodeById[a];
                const B = nodeById[b];
                return (
                  <line
                    key={key}
                    x1={A.x}
                    y1={A.y}
                    x2={B.x}
                    y2={B.y}
                    stroke="#1d1009"
                    strokeWidth="0.88"
                    strokeLinecap="round"
                    style={{ filter: "drop-shadow(0 1px 0 rgba(255,220,160,.2))" }}
                  />
                );
              })}
            </svg>

            <PreviewPath />

            {nodes.map((n) => {
              const piece = pieceAt(n.id);
              const isSelected = selected === n.id;
              const isValidTarget = validTargetIds.includes(n.id);
              const isForcedFox = forcedPreview?.fox === n.id;
              const isForcedHen = forcedPreview?.over === n.id;
              const isForcedLanding = forcedPreview?.to === n.id;
              const isFarm = farmCells.includes(n.id);
              const isTurnPiece = !winner && !forcedPreview && ((turn === "gallinas" && piece === "gallina") || (turn === "zorros" && piece === "zorro"));

              return (
                <motion.button
                  key={n.id}
                  whileTap={{ scale: 0.94 }}
                  animate={isForcedFox ? { x: [0, 12, 0], scale: [1, 1.18, 1] } : isTurnPiece ? { x: 0, scale: [1, 1.07, 1] } : { x: 0, scale: 1 }}
                  transition={isForcedFox ? { duration: 0.8, repeat: 1 } : isTurnPiece ? { duration: 1.25, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  drag={puedeArrastrarFicha(n.id)}
                  dragSnapToOrigin
                  dragMomentum={false}
                  onDragStart={() => iniciarArrastre(n.id)}
                  onDragEnd={(_, info) => terminarArrastre(info)}
                  onClick={() => selectOrMove(n.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[7.4%] h-[7.4%] rounded-full flex items-center justify-center font-black transition-all z-20 ${isSelected ? "ring-4 ring-yellow-300 scale-110 z-30" : ""} ${isValidTarget || isForcedLanding ? "ring-4 ring-lime-300 z-30" : ""} ${isForcedHen ? "ring-4 ring-red-500 z-30" : ""} ${isTurnPiece ? turn === "gallinas" ? "drop-shadow-[0_0_18px_rgba(190,242,100,.75)]" : "drop-shadow-[0_0_20px_rgba(251,146,60,.85)]" : ""}`}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  title={`Posición ${n.id}`}
                >
                  <span className={`absolute inset-0 rounded-full border-[3px] shadow-[0_7px_18px_rgba(0,0,0,.6)] ${isValidTarget || isForcedLanding ? "bg-lime-300 border-lime-900 animate-pulse shadow-[0_0_25px_rgba(190,242,100,.8)]" : isTurnPiece ? turn === "gallinas" ? "bg-[#d6a35c] border-lime-300 shadow-[0_0_18px_rgba(190,242,100,.5)]" : "bg-[#d6a35c] border-orange-300 shadow-[0_0_20px_rgba(251,146,60,.6)]" : isFarm ? "bg-[#d59b57] border-[#4a2a18]" : "bg-[#c58a4a] border-[#4a2a18]"}`} />
                  {!piece && null}
                  {piece === "zorro" && <span className="relative text-2xl sm:text-4xl drop-shadow-lg">🦊</span>}
                  {piece === "gallina" && <span className="relative text-2xl sm:text-4xl drop-shadow-lg">🐔</span>}
                </motion.button>
              );
            })}

            {winner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center p-6 z-50"
              >
                <motion.div initial={{ scale: 0.82, y: 20 }} animate={{ scale: 1, y: 0 }} className="rounded-[2rem] bg-gradient-to-br from-amber-300 to-amber-600 text-black p-8 text-center shadow-2xl border-4 border-white/50 max-w-md">
                  <div className="text-6xl mb-3">{winner === "gallinas" ? "🐔" : "🦊"}</div>
                  <h2 className="text-3xl font-black">Ganaron las {winner}</h2>
                  <p className="mt-2 font-bold">{winner === "gallinas" ? "Llenaron la granja o soplaron a los dos zorros." : "Se comieron 12 gallinas."}</p>
                  <button onClick={resetGame} className="mt-5 rounded-2xl bg-black text-white font-black px-6 py-3">Nueva partida</button>
                </motion.div>
              </motion.div>
            )}
          </div>
        </section>

        <aside className="rounded-[1.5rem] sm:rounded-[2rem] bg-[#22130b]/90 border border-amber-500/25 shadow-[0_25px_80px_rgba(0,0,0,.6)] p-3 sm:p-6 space-y-3 sm:space-y-5 backdrop-blur-xl overflow-y-auto max-h-[38dvh] sm:max-h-none">
          <div>
            <h2 className="text-xl font-black text-amber-100">Estado del juego</h2>
            <p className="hidden sm:block text-amber-100/65 mt-2 text-sm">Antes de soplar al zorro, se muestra la captura que estaba obligado a hacer. Si los zorros quedan sin movimientos, ganan las gallinas.</p>
          </div>

          <div className="rounded-2xl bg-black/30 p-3 sm:p-4 border border-white/10 shadow-inner">
            <p className="text-sm text-amber-100/85 leading-relaxed">{message}</p>
          </div>

          {warningOneFox && !winner && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-yellow-500/15 border border-yellow-400/40 p-4 shadow-[0_0_30px_rgba(250,204,21,.18)]">
              <h3 className="font-black text-yellow-200">⚠️ Advertencia</h3>
              <p className="text-sm text-yellow-100/80 mt-1">Te queda un solo zorro. Si lo pierdes, perderás la partida.</p>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-300/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest">Racha zorro</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-orange-300">{rachaZorro}</h3>
                </div>
                <div className="text-3xl sm:text-4xl">🔥</div>
              </div>
              <div className="hidden sm:block mt-3 h-2 rounded-full bg-black/30 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500" style={{ width: `${Math.min(rachaZorro * 25, 100)}%` }} />
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-lime-500/10 to-emerald-500/10 border border-lime-300/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest">Racha gallinas</p>
                  <h3 className="text-2xl sm:text-3xl font-black text-lime-300">{rachaGallinas}</h3>
                </div>
                <div className="text-3xl sm:text-4xl">🌾</div>
              </div>
              <div className="hidden sm:block mt-3 h-2 rounded-full bg-black/30 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-lime-300 to-emerald-500 transition-all duration-500" style={{ width: `${Math.min(rachaGallinas * 18, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setMostrarAyudaGallinas((prev) => !prev)}
              className={`w-full rounded-2xl px-4 py-3 font-black border transition-all ${mostrarAyudaGallinas ? "bg-lime-400/15 border-lime-300/30 text-lime-100" : "bg-red-500/15 border-red-300/30 text-red-100 shadow-[0_0_25px_rgba(239,68,68,.15)]"}`}
            >
              {mostrarAyudaGallinas ? "Ayuda gallinas: visible" : "Ayuda gallinas: oculta"}
            </button>

            <button
              onClick={() => setMostrarAyudaZorro((prev) => !prev)}
              className={`w-full rounded-2xl px-4 py-3 font-black border transition-all ${mostrarAyudaZorro ? "bg-amber-400/15 border-amber-300/30 text-amber-100" : "bg-red-500/15 border-red-300/30 text-red-100 shadow-[0_0_25px_rgba(239,68,68,.15)]"}`}
            >
              {mostrarAyudaZorro ? "Ayuda zorro: visible" : "Ayuda zorro: oculta"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10">
              <div className="text-2xl">🌾</div>
              <b>{hensInFarm}/9</b>
              <p className="text-xs text-white/50">granja</p>
            </div>
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10">
              <div className="text-2xl">🐔</div>
              <b>{gallinasRestantes}</b>
              <p className="text-xs text-white/50">gallinas</p>
            </div>
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10">
              <div className="text-2xl">🦊</div>
              <b>{foxes.length}</b>
              <p className="text-xs text-white/50">zorros</p>
            </div>
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10">
              <div className="text-2xl">🍗</div>
              <b>{hensEaten}/12</b>
              <p className="text-xs text-white/50">comidas</p>
            </div>
          </div>

          <div className="hidden sm:block rounded-2xl bg-black/25 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-white">Movimientos recientes</h3>
              <span className="text-xs text-white/40">LIVE</span>
            </div>

            <div className="space-y-2 max-h-44 overflow-auto pr-1">
              {movimientos.length === 0 && (
                <div className="text-sm text-white/40">Aún no hay movimientos registrados.</div>
              )}

              {movimientos.map((mov, index) => (
                <div key={index} className="rounded-xl bg-white/5 border border-white/5 px-3 py-2 text-sm text-white/80">
                  {mov}
                </div>
              ))}
            </div>
          </div>

          <div className="hidden sm:block rounded-2xl bg-black/25 border border-white/10 p-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest">Partidas</p>
                <h3 className="text-2xl font-black text-lime-300">{partidasJugadas}</h3>
              </div>
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest">Estado</p>
                <h3 className="text-xl font-black text-amber-300">{winner ? "Finalizado" : "En juego"}</h3>
              </div>
            </div>
          </div>

          <div className="hidden sm:block rounded-2xl bg-amber-500/10 border border-amber-400/20 p-4">
            <h3 className="font-bold text-amber-100">Reglas activas</h3>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-xl bg-black/20 px-3 py-2">🐔 Las gallinas solo avanzan.</div>
              <div className="rounded-xl bg-black/20 px-3 py-2">🦊 El zorro puede comer varias veces seguidas.</div>
              <div className="rounded-xl bg-black/20 px-3 py-2">🎯 Puedes ocultar la ayuda visual de gallinas y zorros para subir la dificultad.</div>
              <div className="rounded-xl bg-black/20 px-3 py-2">✨ Las fichas del turno actual brillan suavemente.</div>
              <div className="rounded-xl bg-black/20 px-3 py-2">💨 Si no come teniendo captura, queda soplado.</div>
              <div className="rounded-xl bg-black/20 px-3 py-2">🚫 Si los zorros no pueden moverse, pierden.</div>
            </div>
            <p className="text-sm text-amber-100/70 mt-1">Si el zorro tiene captura obligatoria y no come, se muestra el salto correcto y luego ese zorro desaparece. Si ningún zorro puede moverse, quedan atrapados y ganan las gallinas.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:gap-3 sticky bottom-0 bg-[#22130b]/95 pt-2">
            <button onClick={activarSonidos} className={`w-full rounded-2xl font-black py-2.5 sm:py-3 shadow-lg transition-transform hover:scale-[1.01] active:scale-[.98] ${soundEnabled ? "bg-lime-300 text-black shadow-lime-900/20" : "bg-white/10 text-white border border-white/15"}`}>
              {soundEnabled ? "Sonidos activados" : "Activar sonidos"}
            </button>
            <button onClick={resetGame} className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 text-black font-black py-2.5 sm:py-3 shadow-lg shadow-amber-900/30 hover:scale-[1.01] active:scale-[.98] transition-transform">
              Reiniciar partida
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

