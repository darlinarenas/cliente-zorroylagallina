import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ZorroGallinaPrototype() {
  const tableroRef = useRef(null);
  const arrastreOrigenRef = useRef(null);
  const historialPcRef = useRef([]);
  const [turn, setTurn] = useState("gallinas");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("Selecciona una gallina para moverla.");
  const [winner, setWinner] = useState(null);
  const [sopladoAlert, setSopladoAlert] = useState(null);
  const [warningOneFox, setWarningOneFox] = useState(false);
  const [forcedPreview, setForcedPreview] = useState(null);
  const [capturingFox, setCapturingFox] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [panelMovil, setPanelMovil] = useState(null);

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
    setMessage("Sonidos activados. Ahora escucharás movimientos, capturas, zorro soplao y victoria.");
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
  const [modoJuego, setModoJuego] = useState("dos_jugadores");
  const [juegoIniciado, setJuegoIniciado] = useState(false);
  const [pcMovimientoPreview, setPcMovimientoPreview] = useState(null);

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
          if (!fromNode || !toNode || isOccupied(to)) return false;

          // Corrección anti-bucle gallina:
          // Las gallinas avanzan hacia el gallinero. Cuando llegan a la última línea
          // del gallinero (fila superior), solo pueden hacer un último ajuste lateral
          // desde el centro hacia una esquina. Al quedar en esquina, ya no tienen más movimientos.
          const esMovimientoVerticalHaciaGallinero = toNode.row < fromNode.row;
          const esMovimientoLateral = toNode.row === fromNode.row;
          const estaEnUltimaLineaGallinero = fromNode.row === 0;
          const estaEnCentroDeUltimaLinea = estaEnUltimaLineaGallinero && fromNode.col === 3;
          const destinoEsEsquinaFinal = toNode.row === 0 && (toNode.col === 2 || toNode.col === 4);

          if (esMovimientoVerticalHaciaGallinero) return true;
          if (esMovimientoLateral && estaEnCentroDeUltimaLinea && destinoEsEsquinaFinal) return true;

          return false;
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

  const esTurnoComputadora = () => {
    if (!juegoIniciado) return false;
    if (modoJuego === "humano_gallinas" && turn === "zorros") return true;
    if (modoJuego === "humano_zorros" && turn === "gallinas") return true;
    return false;
  };

  const esMovimientoPcRepetido = (movimiento) => {
    const historial = historialPcRef.current || [];
    const ultimo = historial[0];
    const penultimo = historial[1];

    const reversaInmediata = ultimo && ultimo.from === movimiento.to && ultimo.to === movimiento.from;
    const mismoVaivenRepetido =
      ultimo &&
      penultimo &&
      ultimo.from === penultimo.to &&
      ultimo.to === penultimo.from &&
      ((movimiento.from === ultimo.to && movimiento.to === ultimo.from) ||
        (movimiento.from === ultimo.from && movimiento.to === ultimo.to));

    return { reversaInmediata, mismoVaivenRepetido };
  };

  const registrarMovimientoPc = (movimiento) => {
    if (!movimiento?.from || !movimiento?.to) return;
    historialPcRef.current = [
      { from: movimiento.from, to: movimiento.to, type: movimiento.type, turn },
      ...(historialPcRef.current || []),
    ].slice(0, 8);
  };

  const obtenerMovimientoComputadoraZorro = () => {
    const zorrosDisponibles = capturingFox ? foxes.filter((zorro) => zorro === capturingFox) : foxes;
    const capturas = zorrosDisponibles.flatMap((zorro) =>
      getCaptureMovesForFox(zorro).map((movimiento) => ({ ...movimiento, from: zorro }))
    );

    if (capturas.length > 0) {
      return capturas
        .map((movimiento) => {
          const nextFoxes = foxes.map((pos) => (pos === movimiento.from ? movimiento.to : pos));
          const nextHens = hens.filter((pos) => pos !== movimiento.over);
          const siguientes = getCaptureMovesForFox(movimiento.to, nextHens, nextFoxes).length;
          return { ...movimiento, score: 100 + siguientes * 20 };
        })
        .sort((a, b) => b.score - a.score)[0];
    }

    const movimientosNormales = zorrosDisponibles.flatMap((zorro) =>
      connections[zorro]
        .filter((to) => !isOccupied(to))
        .map((to) => ({ type: "move", from: zorro, to }))
    );

    if (movimientosNormales.length === 0) return null;

    return movimientosNormales
      .map((movimiento) => {
        const origen = nodeById[movimiento.from];
        const destino = nodeById[movimiento.to];
        const avanceHaciaGallinas = destino && origen ? destino.row - origen.row : 0;
        const opcionesDesdeDestino = connections[movimiento.to]?.filter((to) => !isOccupied(to)).length || 0;
        const { reversaInmediata, mismoVaivenRepetido } = esMovimientoPcRepetido(movimiento);

        // Corrección anti-bucle zorro:
        // Se penaliza fuerte regresar a la misma casilla anterior y mucho más repetir
        // el mismo vaivén. Además se premian destinos con más salidas para que el zorro
        // no se quede pegado entre dos posiciones si tiene alternativas reales.
        const penalizacionBucle = (reversaInmediata ? 8 : 0) + (mismoVaivenRepetido ? 20 : 0);
        const movilidad = opcionesDesdeDestino * 0.65;

        return {
          ...movimiento,
          score: avanceHaciaGallinas + movilidad - penalizacionBucle + Math.random() * 0.35,
        };
      })
      .sort((a, b) => b.score - a.score)[0];
  };

  const obtenerMovimientoComputadoraGallina = () => {
    const movimientos = hens.flatMap((gallina) =>
      connections[gallina]
        .filter((to) => {
          const fromNode = nodeById[gallina];
          const toNode = nodeById[to];
          if (!fromNode || !toNode || isOccupied(to)) return false;

          // Misma regla que el jugador humano: avanzar hacia el gallinero,
          // y en la última línea solo un ajuste lateral desde el centro a una esquina.
          const esMovimientoVerticalHaciaGallinero = toNode.row < fromNode.row;
          const esMovimientoLateral = toNode.row === fromNode.row;
          const estaEnUltimaLineaGallinero = fromNode.row === 0;
          const estaEnCentroDeUltimaLinea = estaEnUltimaLineaGallinero && fromNode.col === 3;
          const destinoEsEsquinaFinal = toNode.row === 0 && (toNode.col === 2 || toNode.col === 4);

          if (esMovimientoVerticalHaciaGallinero) return true;
          if (esMovimientoLateral && estaEnCentroDeUltimaLinea && destinoEsEsquinaFinal) return true;

          return false;
        })
        .map((to) => ({ type: "move", from: gallina, to }))
    );

    if (movimientos.length === 0) return null;

    return movimientos
      .map((movimiento) => {
        const origen = nodeById[movimiento.from];
        const destino = nodeById[movimiento.to];
        const entraGallinero = farmCells.includes(movimiento.to) ? 30 : 0;
        const avance = origen && destino ? origen.row - destino.row : 0;
        const centro = destino ? -Math.abs(destino.col - 3) * 0.2 : 0;
        const { reversaInmediata, mismoVaivenRepetido } = esMovimientoPcRepetido(movimiento);
        const penalizacionBucle = (reversaInmediata ? 10 : 0) + (mismoVaivenRepetido ? 25 : 0);
        const ajusteFinalValido = origen?.row === 0 && origen?.col === 3 && destino?.row === 0 ? 2 : 0;

        return {
          ...movimiento,
          score: entraGallinero + avance * 4 + centro + ajusteFinalValido - penalizacionBucle + Math.random() * 0.35,
        };
      })
      .sort((a, b) => b.score - a.score)[0];
  };

  const ejecutarTurnoComputadora = () => {
    if (winner || forcedPreview || !esTurnoComputadora()) return;

    const movimiento = turn === "zorros" ? obtenerMovimientoComputadoraZorro() : obtenerMovimientoComputadoraGallina();

    if (!movimiento) {
      if (turn === "zorros") checkZorrosAtrapados(foxes, hens);
      return;
    }

    const fichaPc = turn === "zorros" ? "zorro" : "gallina";
    setSelected(movimiento.from);
    setPcMovimientoPreview({ from: movimiento.from, to: movimiento.to, type: movimiento.type });
    setMessage(`La PC va a mover ${fichaPc}: mira la ficha iluminada y su destino.`);

    setTimeout(() => {
      registrarMovimientoPc(movimiento);
      selectOrMove(movimiento.to, movimiento.from, true);
      setPcMovimientoPreview(null);
    }, 850);
  };

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

    const rect = tableroRef.current?.getBoundingClientRect();
    const nodoOrigen = nodeById[origen];
    const movimientosOrigen = getValidMoves(origen);

    if (!rect || !nodoOrigen || movimientosOrigen.length === 0) {
      setSelected(null);
      setMessage("Movimiento cancelado.");
      return;
    }

    // En móvil el dedo no siempre termina exactamente encima del punto.
    // Por eso calculamos el destino usando la dirección del arrastre desde la ficha original
    // y solo aceptamos posiciones que sean movimientos válidos para esa ficha.
    const xProyectado = nodoOrigen.x + (info.offset.x / rect.width) * 100;
    const yProyectado = nodoOrigen.y + (info.offset.y / rect.height) * 100;
    const destinosValidos = movimientosOrigen.map((m) => ({ ...m, nodo: nodeById[m.to] })).filter((m) => m.nodo);

    let mejorDestino = null;
    let mejorDistancia = Infinity;

    destinosValidos.forEach((movimiento) => {
      const distancia = Math.hypot(movimiento.nodo.x - xProyectado, movimiento.nodo.y - yProyectado);
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        mejorDestino = movimiento.to;
      }
    });

    // Si el arrastre fue muy corto, dejamos que funcione como selección normal.
    if (!mejorDestino || mejorDistancia > 13) {
      setSelected(origen);
      setMessage("Ficha seleccionada. También puedes tocar una posición válida.");
      return;
    }

    selectOrMove(mejorDestino, origen);
  };

  const checkGallinaVictory = (nextHens) => {
    const hensInFarm = nextHens.filter((pos) => farmCells.includes(pos)).length;
    if (hensInFarm >= 9) {
      setWinner("gallinas");
      crearSonido("victoria");
      setMessage("¡Las gallinas ganaron! Llenaron el gallinero.");
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
          setMessage("¡Las gallinas ganaron! Los dos zorros quedaron soplaos.");
        } else {
          setTimeout(() => checkZorrosAtrapados(nextFoxes, hens), 50);
        }

        return nextFoxes;
      });

      crearSonido("soplado");
      setSopladoAlert("¡ZORRO SOPLAO!");
      setForcedPreview(null);
      setSelected(null);
      setTurn("gallinas");
    }, 1700);
  };

  const selectOrMove = (id, selectedOverride = null, movimientoComputadora = false) => {
    if (winner || forcedPreview) return;
    if (!juegoIniciado && !movimientoComputadora) {
      setMessage("Elige el modo y presiona Comenzar para iniciar la partida.");
      return;
    }
    if (!movimientoComputadora && esTurnoComputadora()) {
      setMessage("Es turno de la computadora. Espera su movimiento.");
      return;
    }
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

  useEffect(() => {
    if (!juegoIniciado || pcMovimientoPreview || !esTurnoComputadora() || winner || forcedPreview) return;

    setMessage(turn === "zorros" ? "La computadora está pensando con los zorros..." : "La computadora está pensando con las gallinas...");
    const timer = setTimeout(() => {
      ejecutarTurnoComputadora();
    }, 650);

    return () => clearTimeout(timer);
  }, [turn, modoJuego, hens, foxes, capturingFox, winner, forcedPreview, juegoIniciado, pcMovimientoPreview]);

  const resetGame = () => {
    setTurn("gallinas");
    setSelected(null);
    setWinner(null);
    setSopladoAlert(null);
    setWarningOneFox(false);
    setForcedPreview(null);
    setCapturingFox(null);
    setJuegoIniciado(false);
    setPcMovimientoPreview(null);
    historialPcRef.current = [];
    setMessage("Partida reiniciada. Elige el modo y presiona Comenzar.");
    setMovimientos([]);
    setRachaZorro(0);
    setRachaGallinas(0);
    setPartidasJugadas((prev) => prev + 1);
    setHens(initialHens);
    setFoxes(initialFoxes);
    setHensEaten(0);
  };


  const prepararModo = (nuevoModo) => {
    setModoJuego(nuevoModo);
    setJuegoIniciado(false);
    setSelected(null);
    setWinner(null);
    setSopladoAlert(null);
    setWarningOneFox(false);
    setForcedPreview(null);
    setCapturingFox(null);
    setPcMovimientoPreview(null);
    historialPcRef.current = [];
    setMovimientos([]);
    setRachaZorro(0);
    setRachaGallinas(0);
    setHens(initialHens);
    setFoxes(initialFoxes);
    setHensEaten(0);

    if (nuevoModo === "dos_jugadores") {
      setMessage("Modo 2 jugadores seleccionado. Presiona Comenzar para jugar.");
    } else if (nuevoModo === "humano_gallinas") {
      setMessage("Elegiste gallinas. Presiona Comenzar para que luego juegue la PC con los zorros.");
    } else {
      setMessage("Elegiste zorro. Presiona Comenzar para jugar contra las gallinas de la PC.");
    }
  };

  const comenzarPartida = () => {
    setTurn("gallinas");
    setSelected(null);
    setWinner(null);
    setSopladoAlert(null);
    setWarningOneFox(false);
    setForcedPreview(null);
    setCapturingFox(null);
    setPcMovimientoPreview(null);
    historialPcRef.current = [];
    setMovimientos([]);
    setRachaZorro(0);
    setRachaGallinas(0);
    setHens(initialHens);
    setFoxes(initialFoxes);
    setHensEaten(0);
    setJuegoIniciado(true);
    setMessage(modoJuego === "dos_jugadores" ? "Partida iniciada: juegan las gallinas." : "Partida iniciada. Juegan las gallinas primero.");
  };

  const hensInFarm = hens.filter((pos) => farmCells.includes(pos)).length;
  const gallinasRestantes = hens.length;

  const PanelMovilContenido = () => {
    if (!panelMovil) return null;

    if (panelMovil === "modo") {
      return (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-amber-100">Modo de partida</h3>
          <p className="text-sm text-white/60">Elige cómo quieres jugar. La partida no arranca hasta tocar comenzar.</p>

          <div className="grid gap-2">
            <button onClick={() => prepararModo("dos_jugadores")} className={`rounded-2xl px-4 py-3 font-black border transition-all ${modoJuego === "dos_jugadores" ? "bg-lime-300 text-black border-lime-200" : "bg-white/5 text-white border-white/10"}`}>
              2 jugadores local
            </button>
            <button onClick={() => prepararModo("humano_gallinas")} className={`rounded-2xl px-4 py-3 font-black border transition-all ${modoJuego === "humano_gallinas" ? "bg-lime-300 text-black border-lime-200" : "bg-white/5 text-white border-white/10"}`}>
              Yo gallinas vs PC
            </button>
            <button onClick={() => prepararModo("humano_zorros")} className={`rounded-2xl px-4 py-3 font-black border transition-all ${modoJuego === "humano_zorros" ? "bg-orange-300 text-black border-orange-200" : "bg-white/5 text-white border-white/10"}`}>
              Yo zorro vs PC
            </button>
          </div>

          <button onClick={() => { comenzarPartida(); setPanelMovil(null); }} className={`w-full rounded-2xl px-4 py-3 font-black border transition-all ${juegoIniciado ? "bg-white/10 text-white/60 border-white/10" : "bg-gradient-to-r from-lime-300 to-emerald-400 text-black border-lime-200"}`}>
            {juegoIniciado ? "Reiniciar y comenzar" : "Comenzar"}
          </button>
        </div>
      );
    }

    if (panelMovil === "stats") {
      return (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-amber-100">Estadísticas</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10"><div className="text-2xl">🌾</div><b>{hensInFarm}/9</b><p className="text-xs text-white/50">gallinero</p></div>
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10"><div className="text-2xl">🐔</div><b>{gallinasRestantes}</b><p className="text-xs text-white/50">gallinas</p></div>
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10"><div className="text-2xl">🦊</div><b>{foxes.length}</b><p className="text-xs text-white/50">zorros</p></div>
            <div className="rounded-2xl bg-black/30 p-3 border border-white/10"><div className="text-2xl">🍗</div><b>{hensEaten}/12</b><p className="text-xs text-white/50">comidas</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-orange-500/10 border border-orange-300/15 p-4"><p className="text-xs text-white/50 uppercase tracking-widest">Racha zorro</p><h3 className="text-3xl font-black text-orange-300">{rachaZorro}</h3></div>
            <div className="rounded-2xl bg-lime-500/10 border border-lime-300/15 p-4"><p className="text-xs text-white/50 uppercase tracking-widest">Racha gallinas</p><h3 className="text-3xl font-black text-lime-300">{rachaGallinas}</h3></div>
          </div>
        </div>
      );
    }

    if (panelMovil === "ayuda") {
      return (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-amber-100">Ayudas visuales</h3>
          <p className="text-sm text-white/55">También las tienes a mano en los botones laterales: 🐔 y 🦊.</p>
          <button onClick={() => setMostrarAyudaGallinas((prev) => !prev)} className={`w-full rounded-2xl px-4 py-3 font-black border transition-all ${mostrarAyudaGallinas ? "bg-lime-400/15 border-lime-300/30 text-lime-100" : "bg-red-500/15 border-red-300/30 text-red-100"}`}>
            {mostrarAyudaGallinas ? "Ayuda gallinas: visible" : "Ayuda gallinas: oculta"}
          </button>
          <button onClick={() => setMostrarAyudaZorro((prev) => !prev)} className={`w-full rounded-2xl px-4 py-3 font-black border transition-all ${mostrarAyudaZorro ? "bg-amber-400/15 border-amber-300/30 text-amber-100" : "bg-red-500/15 border-red-300/30 text-red-100"}`}>
            {mostrarAyudaZorro ? "Ayuda zorro: visible" : "Ayuda zorro: oculta"}
          </button>
          <div className="rounded-2xl bg-black/25 border border-white/10 p-4 text-sm text-white/70">
            Las fichas del turno actual brillan suavemente. Puedes ocultar los movimientos verdes para subir la dificultad.
          </div>
        </div>
      );
    }

    if (panelMovil === "movimientos") {
      return (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-amber-100">Movimientos</h3>
          <div className="space-y-2 max-h-[45dvh] overflow-auto pr-1">
            {movimientos.length === 0 && <div className="text-sm text-white/45">Aún no hay movimientos registrados.</div>}
            {movimientos.map((mov, index) => (
              <div key={index} className="rounded-xl bg-white/5 border border-white/5 px-3 py-2 text-sm text-white/80">{mov}</div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h3 className="text-xl font-black text-amber-100">Estado</h3>
        <div className="rounded-2xl bg-black/30 p-4 border border-white/10"><p className="text-sm text-amber-100/85 leading-relaxed">{message}</p></div>
        <div className="grid gap-2 text-sm">
          <div className="rounded-xl bg-black/20 px-3 py-2">🐔 Las gallinas solo avanzan.</div>
          <div className="rounded-xl bg-black/20 px-3 py-2">🦊 El zorro puede comer varias veces seguidas.</div>
          <div className="rounded-xl bg-black/20 px-3 py-2">💨 Si no come teniendo captura, queda soplao.</div>
          <div className="rounded-xl bg-black/20 px-3 py-2">🚫 Si los zorros no pueden moverse, pierden.</div>
        </div>
      </div>
    );
  };

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
    <div className="h-[100dvh] sm:min-h-screen relative bg-[#100905] text-white flex items-center justify-center p-0 sm:p-5 overflow-hidden sm:overflow-auto">
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

      {!juegoIniciado && !panelMovil && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed left-3 right-3 top-3 z-50 rounded-[1.7rem] bg-[#22130b]/95 border border-amber-400/25 shadow-[0_0_45px_rgba(0,0,0,.75)] backdrop-blur-xl p-4 sm:hidden"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-lg font-black text-amber-100">¿Quién serás?</h3>
              <p className="text-xs text-white/55 mt-1">Elige modo y toca comenzar.</p>
            </div>
            <span className="rounded-full bg-lime-300/15 border border-lime-300/25 px-3 py-1 text-[10px] font-black text-lime-200 whitespace-nowrap">
              SIN INICIAR
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => prepararModo("dos_jugadores")} className={`rounded-2xl px-2 py-3 text-xs font-black border transition-all ${modoJuego === "dos_jugadores" ? "bg-lime-300 text-black border-lime-200" : "bg-white/5 text-white border-white/10"}`}>
              2 jugadores
            </button>
            <button onClick={() => prepararModo("humano_gallinas")} className={`rounded-2xl px-2 py-3 text-xs font-black border transition-all ${modoJuego === "humano_gallinas" ? "bg-lime-300 text-black border-lime-200" : "bg-white/5 text-white border-white/10"}`}>
              Soy gallina
            </button>
            <button onClick={() => prepararModo("humano_zorros")} className={`rounded-2xl px-2 py-3 text-xs font-black border transition-all ${modoJuego === "humano_zorros" ? "bg-orange-300 text-black border-orange-200" : "bg-white/5 text-white border-white/10"}`}>
              Soy zorro
            </button>
          </div>

          <button onClick={comenzarPartida} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-lime-300 to-emerald-400 text-black font-black py-3 shadow-[0_0_28px_rgba(190,242,100,.28)]">
            Comenzar
          </button>
        </motion.div>
      )}

      <div className="fixed left-3 top-3 z-40 sm:hidden flex flex-col gap-2">
        <button
          onClick={activarSonidos}
          className={`w-12 h-12 rounded-2xl font-black backdrop-blur-xl border transition-all ${soundEnabled ? "bg-lime-300 text-black border-lime-100 shadow-[0_0_25px_rgba(190,242,100,.35)]" : "bg-black/55 text-lime-100 border-lime-300/25 shadow-[0_0_18px_rgba(190,242,100,.12)]"}`}
          title={soundEnabled ? "Sonidos activados" : "Activar sonidos"}
        >
          {soundEnabled ? "🔊" : "🔈"}
        </button>
        <button onClick={() => setPanelMovil("estado")} className="w-12 h-12 rounded-2xl bg-black/55 text-white font-black backdrop-blur-xl border border-white/15 shadow-[0_0_18px_rgba(0,0,0,.35)]">ℹ️</button>
        <button onClick={() => setPanelMovil("modo")} className="w-12 h-12 rounded-2xl bg-black/55 text-white font-black backdrop-blur-xl border border-white/15 shadow-[0_0_18px_rgba(0,0,0,.35)]">🎮</button>
      </div>

      {juegoIniciado && !panelMovil && (
        <div className="fixed left-[4.35rem] right-[4.35rem] top-3 z-40 sm:hidden grid grid-cols-4 gap-1.5 pointer-events-none">
          <div className="rounded-2xl bg-black/60 border border-white/15 backdrop-blur-xl px-1.5 py-2 text-center shadow-2xl">
            <div className="text-sm leading-none">🍗</div>
            <b className="text-[11px] leading-none text-amber-100">{hensEaten}/12</b>
          </div>
          <div className="rounded-2xl bg-black/60 border border-orange-300/20 backdrop-blur-xl px-1.5 py-2 text-center shadow-2xl">
            <div className="text-sm leading-none">🔥</div>
            <b className="text-[11px] leading-none text-orange-200">{rachaZorro}</b>
          </div>
          <div className="rounded-2xl bg-black/60 border border-lime-300/20 backdrop-blur-xl px-1.5 py-2 text-center shadow-2xl">
            <div className="text-sm leading-none">🌾</div>
            <b className="text-[11px] leading-none text-lime-200">{rachaGallinas}</b>
          </div>
          <div className="rounded-2xl bg-black/60 border border-lime-300/20 backdrop-blur-xl px-1.5 py-2 text-center shadow-2xl">
            <div className="text-sm leading-none">🏠</div>
            <b className="text-[11px] leading-none text-lime-100">{hensInFarm}/9</b>
          </div>
        </div>
      )}

      <div className="fixed right-3 top-3 z-40 sm:hidden flex flex-col gap-2">
        <button onClick={() => setPanelMovil("stats")} className="w-12 h-12 rounded-2xl bg-black/55 text-white font-black backdrop-blur-xl border border-white/15 shadow-[0_0_18px_rgba(0,0,0,.35)]">📊</button>
        <button
          onClick={() => setMostrarAyudaGallinas((prev) => !prev)}
          className={`w-12 h-12 rounded-2xl font-black backdrop-blur-xl border transition-all ${mostrarAyudaGallinas ? "bg-lime-300/90 text-black border-lime-100 shadow-[0_0_22px_rgba(190,242,100,.35)]" : "bg-red-500/80 text-white border-red-200/70 shadow-[0_0_22px_rgba(239,68,68,.25)]"}`}
          title={mostrarAyudaGallinas ? "Ayuda gallinas visible" : "Ayuda gallinas oculta"}
        >
          🐔
        </button>
        <button
          onClick={() => setMostrarAyudaZorro((prev) => !prev)}
          className={`w-12 h-12 rounded-2xl font-black backdrop-blur-xl border transition-all ${mostrarAyudaZorro ? "bg-amber-300/90 text-black border-amber-100 shadow-[0_0_22px_rgba(251,191,36,.35)]" : "bg-red-500/80 text-white border-red-200/70 shadow-[0_0_22px_rgba(239,68,68,.25)]"}`}
          title={mostrarAyudaZorro ? "Ayuda zorro visible" : "Ayuda zorro oculta"}
        >
          🦊
        </button>
        <button onClick={() => setPanelMovil("ayuda")} className="w-12 h-12 rounded-2xl bg-black/55 text-white font-black backdrop-blur-xl border border-white/15 shadow-[0_0_18px_rgba(0,0,0,.35)]">🎯</button>
        <button onClick={() => setPanelMovil("movimientos")} className="w-12 h-12 rounded-2xl bg-black/55 text-white font-black backdrop-blur-xl border border-white/15 shadow-[0_0_18px_rgba(0,0,0,.35)]">📜</button>
      </div>

      <div className="fixed left-1/2 bottom-3 -translate-x-1/2 z-40 sm:hidden flex items-center gap-2 rounded-full bg-black/55 border border-white/15 backdrop-blur-xl px-3 py-2 shadow-2xl">
        <span className="text-xs text-white/50">Turno</span>
        <b className="capitalize text-sm text-amber-100">{winner ? "fin" : turn}</b>
        <button onClick={resetGame} className="ml-2 rounded-full bg-amber-400 text-black px-3 py-1.5 text-xs font-black">Reiniciar</button>
      </div>

      <AnimatePresence>
        {panelMovil && (
          <motion.div className="fixed inset-0 z-50 sm:hidden bg-black/55 backdrop-blur-sm flex items-end p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ y: 80, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 80, scale: 0.96 }} className="w-full max-h-[78dvh] overflow-auto rounded-[2rem] bg-[#22130b]/95 border border-amber-400/25 shadow-[0_0_60px_rgba(0,0,0,.8)] p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Panel</span>
                <button onClick={() => setPanelMovil(null)} className="w-10 h-10 rounded-full bg-white/10 border border-white/10 font-black">✕</button>
              </div>
              <PanelMovilContenido />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative w-full h-full sm:h-auto max-w-7xl grid grid-rows-1 xl:grid-rows-1 xl:grid-cols-[1fr_360px] gap-0 sm:gap-5 items-center justify-items-center overflow-hidden sm:overflow-visible">
        <section className="relative flex h-full w-full items-center justify-center bg-transparent border-0 shadow-none px-1 py-0 sm:block sm:h-auto sm:rounded-[2rem] sm:bg-[#22130b]/75 sm:border sm:border-amber-500/25 sm:shadow-[0_25px_90px_rgba(0,0,0,.65)] sm:p-6 sm:backdrop-blur-xl">
          <div className="hidden sm:flex justify-between items-start mb-4 gap-3">
            <div>
              <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-lime-300/10 border border-lime-200/20 px-3 py-1 text-xs text-lime-100 mb-2">
                <span className="w-2 h-2 rounded-full bg-lime-300 shadow-[0_0_10px_#bef264]" />
                Prototipo jugable
              </div>
              <h1 className="text-lg sm:text-5xl font-black tracking-tight leading-tight">El Zorro y la Gallina</h1>
              <p className="hidden sm:block text-amber-100/70 text-sm sm:text-base mt-1">Tablero iluminado, gallinero, captura obligatoria y zorro soplao.</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-amber-500/15 border border-amber-300/30 text-amber-100 text-sm whitespace-nowrap shadow-inner">
              <span className="hidden sm:inline">Turno: </span><b className="capitalize">{winner ? "fin" : turn}</b>
            </div>
          </div>

          <div ref={tableroRef} className="relative mx-auto aspect-square w-[98vw] max-w-[calc(100dvh-7.4rem)] sm:w-full sm:max-w-[790px] rounded-[1.4rem] sm:rounded-[2rem] bg-[#2b190f] shadow-[inset_0_0_60px_rgba(0,0,0,.75),0_25px_70px_rgba(0,0,0,.5)] overflow-hidden border border-amber-700/40 touch-none">
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
              const isTurnPiece = !winner && !forcedPreview && juegoIniciado && ((turn === "gallinas" && piece === "gallina") || (turn === "zorros" && piece === "zorro"));
              const isPcFrom = pcMovimientoPreview?.from === n.id;
              const isPcTo = pcMovimientoPreview?.to === n.id;

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
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[8.4%] h-[8.4%] sm:w-[7.4%] sm:h-[7.4%] rounded-full flex items-center justify-center font-black transition-all z-20 ${isSelected ? "ring-4 ring-yellow-300 scale-110 z-30" : ""} ${isValidTarget || isForcedLanding ? "ring-4 ring-lime-300 z-30" : ""} ${isForcedHen ? "ring-4 ring-red-500 z-30" : ""} ${isPcFrom ? "ring-4 ring-sky-300 z-40" : ""} ${isPcTo ? "ring-4 ring-cyan-300 z-40" : ""} ${isTurnPiece ? turn === "gallinas" ? "drop-shadow-[0_0_18px_rgba(190,242,100,.75)]" : "drop-shadow-[0_0_20px_rgba(251,146,60,.85)]" : ""}`}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  title={`Posición ${n.id}`}
                >
                  <span className={`absolute inset-0 rounded-full border-[3px] shadow-[0_7px_18px_rgba(0,0,0,.6)] ${isPcTo ? "bg-cyan-300 border-cyan-900 animate-pulse shadow-[0_0_30px_rgba(103,232,249,.85)]" : isPcFrom ? "bg-sky-300 border-sky-900 shadow-[0_0_28px_rgba(125,211,252,.8)]" : isValidTarget || isForcedLanding ? "bg-lime-300 border-lime-900 animate-pulse shadow-[0_0_25px_rgba(190,242,100,.8)]" : isTurnPiece ? turn === "gallinas" ? "bg-[#d6a35c] border-lime-300 shadow-[0_0_18px_rgba(190,242,100,.5)]" : "bg-[#d6a35c] border-orange-300 shadow-[0_0_20px_rgba(251,146,60,.6)]" : isFarm ? "bg-[#d59b57] border-[#4a2a18]" : "bg-[#c58a4a] border-[#4a2a18]"}`} />
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
                  <p className="mt-2 font-bold">{winner === "gallinas" ? "Llenaron el gallinero o soplaron a los dos zorros." : "Se comieron 12 gallinas."}</p>
                  <button onClick={resetGame} className="mt-5 rounded-2xl bg-black text-white font-black px-6 py-3">Nueva partida</button>
                </motion.div>
              </motion.div>
            )}
          </div>
        </section>

        <aside className="hidden sm:block rounded-[2rem] bg-[#22130b]/90 border border-amber-500/25 shadow-[0_25px_80px_rgba(0,0,0,.6)] p-6 space-y-5 backdrop-blur-xl overflow-y-auto max-h-none">
          <div>
            <h2 className="text-xl font-black text-amber-100">Estado del juego</h2>
            <p className="hidden sm:block text-amber-100/65 mt-2 text-sm">Antes de soplar al zorro, se muestra la captura que estaba obligado a hacer. Si los zorros quedan sin movimientos, ganan las gallinas.</p>
          </div>

          <div className="rounded-2xl bg-black/30 p-3 sm:p-4 border border-white/10 shadow-inner">
            <p className="text-sm text-amber-100/85 leading-relaxed">{message}</p>
          </div>

          <div className="rounded-2xl bg-black/25 border border-white/10 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-black text-white text-sm sm:text-base">Modo de partida</h3>
                <p className="hidden sm:block text-xs text-white/45 mt-1">Puedes jugar local o contra una computadora simple/intermedia.</p>
              </div>
              <span className="rounded-full bg-lime-300/15 border border-lime-300/25 px-3 py-1 text-[11px] font-black text-lime-200 whitespace-nowrap">
                {!juegoIniciado ? "LISTO" : modoJuego === "dos_jugadores" ? "LOCAL" : "VS PC"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => prepararModo("dos_jugadores")}
                className={`rounded-2xl px-3 py-3 font-black border transition-all ${modoJuego === "dos_jugadores" ? "bg-lime-300 text-black border-lime-200 shadow-[0_0_22px_rgba(190,242,100,.22)]" : "bg-white/5 text-white border-white/10"}`}
              >
                2 jugadores
              </button>

              <button
                onClick={() => prepararModo("humano_gallinas")}
                className={`rounded-2xl px-3 py-3 font-black border transition-all ${modoJuego === "humano_gallinas" ? "bg-lime-300 text-black border-lime-200 shadow-[0_0_22px_rgba(190,242,100,.22)]" : "bg-white/5 text-white border-white/10"}`}
              >
                Yo gallinas vs PC
              </button>

              <button
                onClick={() => prepararModo("humano_zorros")}
                className={`rounded-2xl px-3 py-3 font-black border transition-all ${modoJuego === "humano_zorros" ? "bg-orange-300 text-black border-orange-200 shadow-[0_0_22px_rgba(251,146,60,.22)]" : "bg-white/5 text-white border-white/10"}`}
              >
                Yo zorro vs PC
              </button>
            </div>

            <button
              onClick={comenzarPartida}
              className={`mt-3 w-full rounded-2xl px-4 py-3 font-black border transition-all ${juegoIniciado ? "bg-white/10 text-white/60 border-white/10" : "bg-gradient-to-r from-lime-300 to-emerald-400 text-black border-lime-200 shadow-[0_0_28px_rgba(190,242,100,.28)]"}`}
            >
              {juegoIniciado ? "Partida en curso" : "Comenzar"}
            </button>

            <p className="mt-3 text-xs text-white/45">La computadora es simple: captura si puede, sigue capturando si tiene cadena y si no, hace un movimiento válido.</p>
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
              <p className="text-xs text-white/50">gallinero</p>
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
              <div className="rounded-xl bg-black/20 px-3 py-2">💨 Si no come teniendo captura, queda soplao.</div>
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








