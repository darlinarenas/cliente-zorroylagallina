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
  const [dificultadPc, setDificultadPc] = useState("dificil");
  const [efectoCaptura, setEfectoCaptura] = useState(null);
  const [logroActivo, setLogroActivo] = useState(null);
  const [logrosDesbloqueados, setLogrosDesbloqueados] = useState([]);
  const logroTimerRef = useRef(null);
  const ambienteTimerRef = useRef(null);


  const nivelesDificultad = {
    dificil: { nombre: "Difícil", detalle: "IA táctica: protege zona y castiga errores básicos", badge: "🔴" },
    experto: { nombre: "Experto", detalle: "IA técnica: calcula trampas, sacrificios y encierros", badge: "🧠" },
    leyenda: { nombre: "Leyenda", detalle: "IA salvaje: más precisa, menos predecible y más intensa", badge: "👑" },
  };

  // Dificultades premium:
  // - Difícil: ahora es el punto de entrada, equivalente a una PC seria.
  // - Experto: cuida mejor el gallinero, evita alejarse sin beneficio y lee sacrificios.
  // - Leyenda: usa la evaluación más estricta, reduce el azar y juega con presión territorial.
  const pcEsFuerte = true;
  const pcEsExperta = dificultadPc === "experto" || dificultadPc === "leyenda";
  const pcEsLeyenda = dificultadPc === "leyenda";

  const crearSonido = (tipo) => {
    if (!soundEnabled) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const master = ctx.createGain();
    // Ajuste de audio:
    // los ambientes de suspenso necesitan más duración que los efectos cortos,
    // por eso el master se mantiene vivo más tiempo solo en esos casos.
    const duracionMaster =
      tipo === "suspensoProfundo" ? 3.6 :
      tipo === "tensionFinal" ? 3.05 :
      1.25;
    const volumenMaster =
      tipo === "suspensoProfundo" ? 0.24 :
      tipo === "tensionFinal" ? 0.26 :
      0.18;

    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(volumenMaster, ctx.currentTime + 0.035);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracionMaster);
    master.connect(ctx.destination);

    const tocarTono = ({ frecuencia = 440, inicio = 0, duracion = 0.16, tipoOsc = "sine", volumen = 0.08, destino = master }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tipoOsc;
      osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + inicio);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, frecuencia * 0.72), ctx.currentTime + inicio + duracion);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(volumen, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);
      osc.connect(gain);
      gain.connect(destino);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracion + 0.03);
    };

    const tocarRuido = ({ inicio = 0, duracion = 0.18, volumen = 0.06, filtro = 1200 }) => {
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duracion));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(filtro, ctx.currentTime + inicio);
      filter.Q.setValueAtTime(4, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(volumen, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(ctx.currentTime + inicio);
      source.stop(ctx.currentTime + inicio + duracion + 0.02);
    };

    // Sonidos salvajes generados por código:
    // No dependen de archivos externos. Si más adelante tienes MP3 reales,
    // podemos conectarlos conservando estos sonidos como respaldo.
    if (tipo === "zorroSalvaje") {
      tocarTono({ frecuencia: 150, duracion: 0.42, tipoOsc: "sawtooth", volumen: 0.11 });
      tocarTono({ frecuencia: 95, inicio: 0.08, duracion: 0.48, tipoOsc: "triangle", volumen: 0.1 });
      tocarRuido({ inicio: 0.03, duracion: 0.35, volumen: 0.055, filtro: 520 });
      return;
    }

    if (tipo === "gallinasAsustadas") {
      [0, 0.08, 0.15, 0.23].forEach((inicio, index) => {
        tocarTono({ frecuencia: 760 + index * 90, inicio, duracion: 0.09, tipoOsc: "square", volumen: 0.045 });
      });
      tocarRuido({ inicio: 0.02, duracion: 0.26, volumen: 0.03, filtro: 2100 });
      return;
    }

    if (tipo === "capturaEpica") {
      tocarTono({ frecuencia: 115, duracion: 0.26, tipoOsc: "sawtooth", volumen: 0.12 });
      tocarTono({ frecuencia: 55, inicio: 0.04, duracion: 0.42, tipoOsc: "triangle", volumen: 0.12 });
      tocarRuido({ inicio: 0, duracion: 0.22, volumen: 0.08, filtro: 760 });
      tocarTono({ frecuencia: 320, inicio: 0.18, duracion: 0.16, tipoOsc: "square", volumen: 0.045 });
      return;
    }

    if (tipo === "suspenso" || tipo === "suspensoProfundo") {
      // Música de suspenso retro táctica:
      // patrón original estilo videojuego clásico: "tiririri / piripipi",
      // con notas cortas tipo chip, un bajo suave y suficiente espacio para
      // que los efectos de captura, movimiento y victoria sigan destacando.
      const melodia = [
        { f: 392, t: 0.00 }, { f: 466, t: 0.12 }, { f: 523, t: 0.24 }, { f: 466, t: 0.36 },
        { f: 392, t: 0.62 }, { f: 466, t: 0.74 }, { f: 587, t: 0.86 }, { f: 523, t: 0.98 },
        { f: 349, t: 1.28 }, { f: 392, t: 1.40 }, { f: 466, t: 1.52 }, { f: 392, t: 1.64 },
        { f: 330, t: 1.94 }, { f: 392, t: 2.06 }, { f: 523, t: 2.18 }, { f: 466, t: 2.30 },
      ];

      melodia.forEach((nota, index) => {
        tocarTono({
          frecuencia: nota.f,
          inicio: nota.t,
          duracion: index % 4 === 3 ? 0.13 : 0.09,
          tipoOsc: "square",
          volumen: 0.036,
        });
      });

      // Bajo discreto para que no suene infantil, sino a tensión de estrategia.
      tocarTono({ frecuencia: 98, inicio: 0.00, duracion: 0.42, tipoOsc: "triangle", volumen: 0.036 });
      tocarTono({ frecuencia: 123, inicio: 0.86, duracion: 0.36, tipoOsc: "triangle", volumen: 0.032 });
      tocarTono({ frecuencia: 87, inicio: 1.70, duracion: 0.46, tipoOsc: "triangle", volumen: 0.038 });
      tocarRuido({ inicio: 0.02, duracion: 0.28, volumen: 0.012, filtro: 950 });
      return;
    }

    if (tipo === "tensionFinal") {
      // Versión final más rápida e intensa:
      // mantiene el estilo retro, pero acelera el patrón para avisar que la
      // partida está a punto de definirse.
      const melodiaFinal = [
        { f: 523, t: 0.00 }, { f: 587, t: 0.09 }, { f: 622, t: 0.18 }, { f: 587, t: 0.27 },
        { f: 466, t: 0.45 }, { f: 523, t: 0.54 }, { f: 587, t: 0.63 }, { f: 523, t: 0.72 },
        { f: 392, t: 0.94 }, { f: 466, t: 1.03 }, { f: 523, t: 1.12 }, { f: 466, t: 1.21 },
        { f: 349, t: 1.43 }, { f: 392, t: 1.52 }, { f: 466, t: 1.61 }, { f: 523, t: 1.70 },
      ];

      melodiaFinal.forEach((nota, index) => {
        tocarTono({
          frecuencia: nota.f,
          inicio: nota.t,
          duracion: index % 4 === 3 ? 0.105 : 0.07,
          tipoOsc: "square",
          volumen: 0.044,
        });
      });

      tocarTono({ frecuencia: 73, inicio: 0.00, duracion: 0.58, tipoOsc: "sawtooth", volumen: 0.04 });
      tocarTono({ frecuencia: 98, inicio: 0.70, duracion: 0.5, tipoOsc: "triangle", volumen: 0.038 });
      tocarTono({ frecuencia: 65, inicio: 1.38, duracion: 0.62, tipoOsc: "sawtooth", volumen: 0.042 });
      tocarRuido({ inicio: 0.05, duracion: 0.38, volumen: 0.018, filtro: 780 });
      return;
    }

    if (tipo === "logro") {
      [420, 560, 760].forEach((frecuencia, index) => {
        tocarTono({ frecuencia, inicio: index * 0.08, duracion: 0.2, tipoOsc: "sine", volumen: 0.055 });
      });
      return;
    }

    const presets = {
      mover: { frecuencia: 420, duracion: 0.09, tipo: "sine", volumen: 0.05 },
      comer: { frecuencia: 180, duracion: 0.18, tipo: "sawtooth", volumen: 0.08 },
      soplado: { frecuencia: 90, duracion: 0.32, tipo: "triangle", volumen: 0.1 },
      victoria: { frecuencia: 660, duracion: 0.42, tipo: "square", volumen: 0.07 },
    };

    const config = presets[tipo] || presets.mover;
    tocarTono({
      frecuencia: config.frecuencia,
      duracion: config.duracion,
      tipoOsc: config.tipo,
      volumen: config.volumen,
    });
  };

  const activarSonidos = () => {
    setSoundEnabled(true);
    setTimeout(() => crearSonido("mover"), 0);
    setMessage("Sonidos activados. La música de suspenso sonará solo cuando la partida esté cerca de acabarse.");
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

  const crearHistorialInicialGallinas = () =>
    Object.fromEntries(initialHens.map((pos) => [pos, [pos]]));

  const [hens, setHens] = useState(initialHens);
  const [historialGallinas, setHistorialGallinas] = useState(crearHistorialInicialGallinas);
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
  const [movimientoVisible, setMovimientoVisible] = useState(null);

  // Voltea el tablero dependiendo del lado elegido por el jugador.
  // Si el usuario juega con zorros, el tablero se invierte para que
  // los zorros queden visualmente de su lado.
  const tableroInvertido = modoJuego === "humano_zorros";

  // Nota:
  // El tablero físico se rota cuando el jugador elige zorros,
  // pero los textos, modales y piezas visibles se contra-rotan
  // para que siempre se lean correctamente desde la vista del usuario.

  // Muestra una ficha fantasma viajando entre origen y destino para que el movimiento no se vea brusco.
  const mostrarMovimientoVisible = (from, to, piece, type = "move") => {
    if (!from || !to || !piece) return;
    setMovimientoVisible({ from, to, piece, type, key: `${piece}-${from}-${to}-${Date.now()}` });
  };

  const dispararEfectoCaptura = (from, to, tipo = "captura") => {
    const origen = nodeById[from];
    const destino = nodeById[to];
    if (!origen || !destino) return;

    setEfectoCaptura({
      from,
      to,
      tipo,
      x: destino.x,
      y: destino.y,
      key: `${tipo}-${from}-${to}-${Date.now()}`,
    });

    setTimeout(() => setEfectoCaptura(null), 850);
  };

  const obtenerTituloVictoria = (bando) => {
    const titulosZorro = {
      dificil: "Zorro Salvaje",
      experto: "Zorro Domador",
      leyenda: "Zorro Leyenda",
    };

    const titulosGallina = {
      dificil: "Gallina Brava",
      experto: "Gallina Táctica",
      leyenda: "Gallina Leyenda",
    };

    return bando === "zorros"
      ? titulosZorro[dificultadPc] || "Zorro Salvaje"
      : titulosGallina[dificultadPc] || "Gallina Brava";
  };

  const desbloquearLogro = (id) => {
    const logros = {
      primera_captura: {
        titulo: "Primer zarpazo",
        detalle: "El zorro probó sangre por primera vez.",
        icono: "🦊",
      },
      doble_captura: {
        titulo: "Cadena salvaje",
        detalle: "El zorro enlazó una racha peligrosa.",
        icono: "🔥",
      },
      zorro_soplao: {
        titulo: "Zorro soplao",
        detalle: "La presión del gallinero cobró una víctima.",
        icono: "💨",
      },
      gallinero_medio: {
        titulo: "Gallinero tomado",
        detalle: "Las gallinas ya sienten la victoria cerca.",
        icono: "🌾",
      },
      victoria_gallinas: {
        titulo: obtenerTituloVictoria("gallinas"),
        detalle: "Título desbloqueado para las gallinas por dominar la partida.",
        icono: "🐔",
      },
      victoria_zorros: {
        titulo: obtenerTituloVictoria("zorros"),
        detalle: "Título desbloqueado para los zorros por imponer su cacería.",
        icono: "🦊",
      },
    };

    const logro = logros[id];
    if (!logro) return;

    setLogrosDesbloqueados((prev) => {
      if (prev.includes(id)) return prev;

      if (logroTimerRef.current) clearTimeout(logroTimerRef.current);
      setLogroActivo({ id, ...logro, key: `${id}-${Date.now()}` });
      crearSonido("logro");

      logroTimerRef.current = setTimeout(() => {
        setLogroActivo(null);
      }, 2600);

      return [...prev, id];
    });
  };

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

  const gallinaYaVisito = (from, to, historial = historialGallinas) => {
    const historialDeGallina = historial?.[from] || [];
    return historialDeGallina.includes(to);
  };

  const moverHistorialGallina = (from, to) => {
    setHistorialGallinas((prev) => {
      const historialActual = prev?.[from] || [from];
      const siguiente = { ...prev };
      delete siguiente[from];

      // Nueva regla del gallinero:
      // cada gallina recuerda su propio camino. Puede moverse lateralmente
      // en la línea superior, pero no puede volver a una posición que ya pisó.
      siguiente[to] = historialActual.includes(to)
        ? historialActual
        : [...historialActual, to];

      return siguiente;
    });
  };

  const eliminarGallinaDelHistorial = (posicion) => {
    setHistorialGallinas((prev) => {
      const siguiente = { ...prev };
      delete siguiente[posicion];
      return siguiente;
    });
  };

  const construirHistorialGallinaMovida = (from, to, historial = historialGallinas) => {
    const historialActual = historial?.[from] || [from];
    const siguiente = { ...historial };
    delete siguiente[from];
    siguiente[to] = historialActual.includes(to) ? historialActual : [...historialActual, to];
    return siguiente;
  };

  const construirHistorialSinGallina = (posicion, historial = historialGallinas) => {
    const siguiente = { ...historial };
    delete siguiente[posicion];
    return siguiente;
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

          // Nueva regla final de la gallina:
          // la gallina nunca puede retroceder hacia abajo, pero al llegar a la
          // línea superior del gallinero sí puede seguir moviéndose lateralmente.
          // Lo único prohibido es volver a pisar una posición que ESA misma gallina
          // ya visitó antes durante la partida.
          if (toNode.row > fromNode.row) return false;
          if (gallinaYaVisito(id, to)) return false;

          return true;
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

  // Detecta si las gallinas se quedaron sin movimientos válidos.
  // Nueva regla de empate: si es turno de gallinas y ninguna puede avanzar
  // ni moverse lateralmente sin repetir casilla, la partida termina empatada.
  const obtenerMovimientosGallinasEnEstado = (hensList = hens, historial = historialGallinas, foxesList = foxes) => {
    return hensList.flatMap((gallina) =>
      (connections[gallina] || [])
        .filter((to) => {
          const fromNode = nodeById[gallina];
          const toNode = nodeById[to];
          if (!fromNode || !toNode) return false;
          if (isOccupiedInState(to, hensList, foxesList)) return false;
          if (toNode.row > fromNode.row) return false;

          const historialDeGallina = historial?.[gallina] || [];
          if (historialDeGallina.includes(to)) return false;

          return true;
        })
        .map((to) => ({ type: "move", from: gallina, to }))
    );
  };

  const declararEmpateSinMovimientosGallinas = (nextHens = hens, nextHistorial = historialGallinas, nextFoxes = foxes) => {
    if (winner || nextHens.length === 0) return false;

    const movimientosGallinas = obtenerMovimientosGallinasEnEstado(nextHens, nextHistorial, nextFoxes);

    if (movimientosGallinas.length > 0) return false;

    setWinner("empate");
    setSelected(null);
    setCapturingFox(null);
    crearSonido("tensionFinal");
    setMessage("Se acabaron los movimientos de las gallinas. El juego estuvo intenso: es un empate. Pasemos a la segunda ronda para desempatar.");
    return true;
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

  // Dificultad premium de la PC:
  // - Difícil: ya no es fácil; escoge entre buenas jugadas para sentirse humana.
  // - Experto: casi siempre toma la mejor jugada evaluada.
  // - Leyenda: toma la mejor jugada y penaliza con más fuerza los errores posicionales.
  const elegirMovimientoPorDificultad = (movimientosEvaluados) => {
    if (!movimientosEvaluados.length) return null;
    const ordenados = [...movimientosEvaluados].sort((a, b) => b.score - a.score);

    if (pcEsLeyenda || pcEsExperta) {
      return ordenados[0];
    }

    const candidatos = ordenados.slice(0, Math.min(2, ordenados.length));
    return candidatos[Math.floor(Math.random() * candidatos.length)];
  };

  const distanciaAZonaGallinero = (id) => {
    const nodo = nodeById[id];
    if (!nodo) return 99;
    // La zona que el zorro debe cuidar está arriba/centro.
    // Mientras más se vaya hacia abajo o a los extremos sin capturar, peor se evalúa.
    return Math.abs(nodo.col - 3) + Math.max(0, nodo.row - 2) * 1.65 + Math.max(0, 2 - nodo.row) * 0.25;
  };

  const movilidadZorroEnEstado = (foxId, hensList = hens, foxesList = foxes) => {
    const capturas = getCaptureMovesForFox(foxId, hensList, foxesList).length;
    const normales = connections[foxId]?.filter((to) => !isOccupiedInState(to, hensList, foxesList)).length || 0;
    return capturas * 2 + normales;
  };

  const contarCapturasFuturasParaZorro = (foxId, hensList = hens, foxesList = foxes) => {
    return getCaptureMovesForFox(foxId, hensList, foxesList).length;
  };

  const gallinaQuedaEnPeligro = (henId, hensList = hens, foxesList = foxes) => {
    return foxesList.some((zorro) => {
      const capturas = getCaptureMovesForFox(zorro, hensList, foxesList);
      return capturas.some((captura) => captura.over === henId);
    });
  };

  const obtenerMovimientoComputadoraZorro = () => {
    const zorrosDisponibles = capturingFox ? foxes.filter((zorro) => zorro === capturingFox) : foxes;
    const capturas = zorrosDisponibles.flatMap((zorro) =>
      getCaptureMovesForFox(zorro).map((movimiento) => ({ ...movimiento, from: zorro }))
    );

    if (capturas.length > 0) {
      const evaluadas = capturas.map((movimiento) => {
        const nextFoxes = foxes.map((pos) => (pos === movimiento.from ? movimiento.to : pos));
        const nextHens = hens.filter((pos) => pos !== movimiento.over);
        const siguientes = contarCapturasFuturasParaZorro(movimiento.to, nextHens, nextFoxes);
        const destino = nodeById[movimiento.to];
        const centro = destino ? -Math.abs(destino.col - 3) * (pcEsLeyenda ? 3.1 : pcEsExperta ? 1.55 : 1.05) : 0;
        const distanciaZona = distanciaAZonaGallinero(movimiento.to);
        const movilidadDespues = movilidadZorroEnEstado(movimiento.to, nextHens, nextFoxes);
        const zorroQuedaAtrapado = movilidadDespues <= 0 ? 1 : 0;
        const defensaGallinero = -distanciaZona * (pcEsLeyenda ? 23 : pcEsExperta ? 12 : 8);
        const combo = siguientes * (pcEsLeyenda ? 82 : pcEsExperta ? 50 : 36);
        const supervivencia = movilidadDespues * (pcEsLeyenda ? 13 : pcEsExperta ? 7 : 4) - zorroQuedaAtrapado * 180;
        const azar = Math.random() * (pcEsLeyenda ? 0.01 : pcEsExperta ? 0.025 : 0.08);
        return { ...movimiento, score: 120 + combo + defensaGallinero + supervivencia + centro + azar };
      });

      return elegirMovimientoPorDificultad(evaluadas);
    }

    const movimientosNormales = zorrosDisponibles.flatMap((zorro) =>
      connections[zorro]
        .filter((to) => !isOccupied(to))
        .map((to) => ({ type: "move", from: zorro, to }))
    );

    if (movimientosNormales.length === 0) return null;

    const evaluadas = movimientosNormales.map((movimiento) => {
      const origen = nodeById[movimiento.from];
      const destino = nodeById[movimiento.to];
      const avanceHaciaGallinas = destino && origen ? destino.row - origen.row : 0;
      const { reversaInmediata, mismoVaivenRepetido } = esMovimientoPcRepetido(movimiento);

      const nextFoxes = foxes.map((pos) => (pos === movimiento.from ? movimiento.to : pos));
      const capturasFuturas = contarCapturasFuturasParaZorro(movimiento.to, hens, nextFoxes);
      const distanciaZona = distanciaAZonaGallinero(movimiento.to);
      const distanciaZonaAntes = distanciaAZonaGallinero(movimiento.from);
      const seAlejaDeZona = Math.max(0, distanciaZona - distanciaZonaAntes);
      const movilidadDespues = movilidadZorroEnEstado(movimiento.to, hens, nextFoxes);
      const centro = destino ? -Math.abs(destino.col - 3) * (pcEsLeyenda ? 3.4 : pcEsExperta ? 1.7 : 1.1) : 0;

      // IA táctica del zorro:
      // el zorro no debe irse del gallinero como loco. Solo se aleja si gana captura, movilidad o presión real.
      const penalizacionBucle = (reversaInmediata ? 14 : 0) + (mismoVaivenRepetido ? 34 : 0);
      const defensaGallinero = -distanciaZona * (pcEsLeyenda ? 26 : pcEsExperta ? 13 : 9);
      const castigoAlejarse = -seAlejaDeZona * (pcEsLeyenda ? 44 : pcEsExperta ? 22 : 14);
      const movilidad = movilidadDespues * (pcEsLeyenda ? 11 : pcEsExperta ? 6 : 4);
      const presionCaptura = capturasFuturas * (pcEsLeyenda ? 68 : pcEsExperta ? 36 : 24);
      const avanceControlado = avanceHaciaGallinas > 0 ? avanceHaciaGallinas * (capturasFuturas ? 4 : -8) : Math.abs(avanceHaciaGallinas) * 4;
      const azar = Math.random() * (pcEsLeyenda ? 0.01 : pcEsExperta ? 0.025 : 0.08);

      return {
        ...movimiento,
        score: defensaGallinero + castigoAlejarse + movilidad + presionCaptura + centro + avanceControlado - penalizacionBucle + azar,
      };
    });

    return elegirMovimientoPorDificultad(evaluadas);
  };

  const checkZorrosAtrapadosSimulado = (foxesList = foxes, hensList = hens) => {
    if (!foxesList.length) return true;

    return !foxesList.some((zorroId) => {
      const capturas = getCaptureMovesForFox(zorroId, hensList, foxesList);
      const movimientosNormales = connections[zorroId]?.filter((to) => !isOccupiedInState(to, hensList, foxesList)) || [];
      return capturas.length > 0 || movimientosNormales.length > 0;
    });
  };

  const obtenerMovimientoComputadoraGallina = () => {
    const movimientos = hens.flatMap((gallina) =>
      connections[gallina]
        .filter((to) => {
          const fromNode = nodeById[gallina];
          const toNode = nodeById[to];
          if (!fromNode || !toNode || isOccupied(to)) return false;

          // Misma regla que el jugador humano:
          // la gallina no retrocede hacia abajo, puede moverse lateralmente
          // en la línea superior del gallinero, pero no puede volver a una
          // posición que esa misma gallina ya pisó.
          if (toNode.row > fromNode.row) return false;
          if (gallinaYaVisito(gallina, to)) return false;

          return true;
        })
        .map((to) => ({ type: "move", from: gallina, to }))
    );

    if (movimientos.length === 0) return null;

    const evaluadas = movimientos.map((movimiento) => {
      const origen = nodeById[movimiento.from];
      const destino = nodeById[movimiento.to];
      const nextHens = hens.map((pos) => (pos === movimiento.from ? movimiento.to : pos));
      const entraGallinero = farmCells.includes(movimiento.to) ? 30 : 0;
      const avance = origen && destino ? origen.row - destino.row : 0;
      const centro = destino ? -Math.abs(destino.col - 3) * (pcEsFuerte ? (pcEsExperta ? 0.9 : 0.65) : 0.2) : 0;
      const { reversaInmediata, mismoVaivenRepetido } = esMovimientoPcRepetido(movimiento);
      const penalizacionBucle = (reversaInmediata ? 10 : 0) + (mismoVaivenRepetido ? 25 : 0);
      const ajusteFinalValido = origen?.row === 0 && origen?.col === 3 && destino?.row === 0 ? 2 : 0;
      const quedaEnPeligro = gallinaQuedaEnPeligro(movimiento.to, nextHens, foxes);
      const bloqueaZorro = checkZorrosAtrapadosSimulado(foxes, nextHens) ? 90 : 0;
      const gallinasEnGallineroDespues = nextHens.filter((pos) => farmCells.includes(pos)).length;
      const cierreGallineroExperto = gallinasEnGallineroDespues * (pcEsLeyenda ? 9.2 : pcEsExperta ? 5 : 3.5);
      const destinoCercaCentro = destino ? Math.max(0, 3 - Math.abs(destino.col - 3)) : 0;
      const sacrificioTactico = quedaEnPeligro && avance >= 0 && destinoCercaCentro >= 2 ? (pcEsLeyenda ? 76 : pcEsExperta ? 42 : 24) : 0;
      const seguridad = quedaEnPeligro ? (sacrificioTactico ? -4 : pcEsLeyenda ? -62 : pcEsExperta ? -38 : -24) : 10;
      const presionSobreZorros = foxes.reduce((total, zorro) => total + Math.max(0, 5 - distanciaAZonaGallinero(zorro)), 0) * (pcEsLeyenda ? 4.9 : pcEsExperta ? 2.5 : 1.5);
      const azar = Math.random() * (pcEsLeyenda ? 0.01 : pcEsExperta ? 0.025 : 0.08);

      return {
        ...movimiento,
        score: entraGallinero + avance * (pcEsLeyenda ? 12.5 : pcEsExperta ? 8 : 6.5) + centro + ajusteFinalValido + seguridad + sacrificioTactico + bloqueaZorro + cierreGallineroExperto + presionSobreZorros - penalizacionBucle + azar,
      };
    });

    return elegirMovimientoPorDificultad(evaluadas);
  };

  const ejecutarTurnoComputadora = () => {
    if (winner || forcedPreview || !esTurnoComputadora()) return;

    const movimiento = turn === "zorros" ? obtenerMovimientoComputadoraZorro() : obtenerMovimientoComputadoraGallina();

    if (!movimiento) {
      if (turn === "zorros") checkZorrosAtrapados(foxes, hens);
      if (turn === "gallinas") declararEmpateSinMovimientosGallinas(hens, historialGallinas, foxes);
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
      desbloquearLogro("victoria_gallinas");
      setMessage("¡Las gallinas ganaron! Llenaron el gallinero.");
      return true;
    }
    return false;
  };

  const checkFoxVictory = (nextEaten) => {
    if (nextEaten >= 12) {
      setWinner("zorros");
      crearSonido("victoria");
      desbloquearLogro("victoria_zorros");
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
      crearSonido("zorroSalvaje");
      desbloquearLogro("zorro_soplao");
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
      mostrarMovimientoVisible(currentSelected, id, "gallina", "move");
      const nextHens = hens.map((pos) => (pos === currentSelected ? id : pos));
      setHens(nextHens);
      moverHistorialGallina(currentSelected, id);
      setMovimientos((prev) => [`🐔 Gallina: ${currentSelected} → ${id}`, ...prev].slice(0, 8));
      setSelected(null);
      setCapturingFox(null);
      setRachaZorro(0);
      setRachaGallinas((prev) => prev + 1);
      crearSonido("mover");
      if (nextHens.filter((pos) => farmCells.includes(pos)).length >= 5) desbloquearLogro("gallinero_medio");
      if (checkGallinaVictory(nextHens)) return;
      if (checkZorrosAtrapados(foxes, nextHens)) return;
      setTurn("zorros");
      setMessage("Gallina movida. Ahora juegan los zorros.");
    }

    if (selectedPiece === "zorro") {
      const selectedFoxCaptures = getCaptureMovesForFox(currentSelected).map((m) => ({ ...m, fox: currentSelected }));
      const captureToShow = selectedFoxCaptures[0];

      // Corrección de libertad para escoger zorro:
      // Si el otro zorro tiene una captura, eso ya no bloquea la pieza que tú elegiste.
      // La regla de zorro soplao solo aplica al zorro seleccionado cuando ESE zorro podía comer
      // y el jugador decide moverlo sin capturar.
      if (selectedFoxCaptures.length > 0 && move.type !== "capture") {
        soplarFox(captureToShow);
        return;
      }

      mostrarMovimientoVisible(currentSelected, id, "zorro", move.type);
      const nextFoxes = foxes.map((pos) => (pos === currentSelected ? id : pos));

      if (move.type === "capture") {
        const nextHens = hens.filter((pos) => pos !== move.over);
        const nextEaten = hensEaten + 1;
        setFoxes(nextFoxes);
        setHens(nextHens);
        eliminarGallinaDelHistorial(move.over);
        setHensEaten(nextEaten);
        setRachaZorro((prev) => prev + 1);
        setRachaGallinas(0);
        setMovimientos((prev) => [`🦊 Zorro comió en ${id}`, ...prev].slice(0, 8));
        crearSonido("capturaEpica");
        setTimeout(() => crearSonido("gallinasAsustadas"), 90);
        dispararEfectoCaptura(currentSelected, id, "captura");
        desbloquearLogro("primera_captura");
        if (rachaZorro + 1 >= 2) desbloquearLogro("doble_captura");

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
        setSelected(null);
        const historialDespuesCaptura = construirHistorialSinGallina(move.over);
        if (declararEmpateSinMovimientosGallinas(nextHens, historialDespuesCaptura, nextFoxes)) return;
        setTurn("gallinas");
        setMessage("¡El zorro se comió una gallina! Ahora juegan las gallinas.");
      } else {
        setFoxes(nextFoxes);
        setMovimientos((prev) => [`🦊 Zorro: ${currentSelected} → ${id}`, ...prev].slice(0, 8));
        setCapturingFox(null);
        setRachaZorro(0);
        setRachaGallinas(0);
        crearSonido("mover");
        setSelected(null);
        if (declararEmpateSinMovimientosGallinas(hens, historialGallinas, nextFoxes)) return;
        setTurn("gallinas");
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

  useEffect(() => {
    if (!juegoIniciado || winner || forcedPreview || pcMovimientoPreview || turn !== "gallinas") return;

    const timer = setTimeout(() => {
      declararEmpateSinMovimientosGallinas(hens, historialGallinas, foxes);
    }, 120);

    return () => clearTimeout(timer);
  }, [turn, hens, foxes, historialGallinas, juegoIniciado, winner, forcedPreview, pcMovimientoPreview]);

  const hensInFarm = hens.filter((pos) => farmCells.includes(pos)).length;
  const gallinasRestantes = hens.length;
  const estadoCriticoGallinas = juegoIniciado && !winner && (hensEaten >= 9 || gallinasRestantes <= 11);
  const estadoCriticoZorro = juegoIniciado && !winner && foxes.length === 1;
  const estadoFinalIntenso = estadoCriticoGallinas || estadoCriticoZorro || hensInFarm >= 7;
  const mensajeAlertaFinal = estadoCriticoGallinas
    ? "⚠️ Gallinas en peligro: quedan pocas"
    : estadoCriticoZorro
      ? "⚠️ Un solo zorro: final peligroso"
      : "⚠️ El gallinero está casi tomado";

  useEffect(() => {
    if (ambienteTimerRef.current) {
      clearInterval(ambienteTimerRef.current);
      ambienteTimerRef.current = null;
    }

    if (!soundEnabled || !juegoIniciado || winner || !estadoFinalIntenso) return;

    // La música de suspenso ahora solo aparece cuando el juego está casi por acabarse.
    // Durante el resto de la partida quedan solo los efectos cortos de movimiento/captura.
    crearSonido("tensionFinal");
    ambienteTimerRef.current = setInterval(() => {
      crearSonido("tensionFinal");
    }, 2300);

    return () => {
      if (ambienteTimerRef.current) {
        clearInterval(ambienteTimerRef.current);
        ambienteTimerRef.current = null;
      }
    };
  }, [soundEnabled, juegoIniciado, winner, estadoFinalIntenso]);

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
    setMovimientoVisible(null);
    setEfectoCaptura(null);
    setLogroActivo(null);
    historialPcRef.current = [];
    setMessage("Partida reiniciada. Elige el modo y presiona Comenzar.");
    setMovimientos([]);
    setLogrosDesbloqueados([]);
    setRachaZorro(0);
    setRachaGallinas(0);
    setPartidasJugadas((prev) => prev + 1);
    setHens(initialHens);
    setHistorialGallinas(crearHistorialInicialGallinas());
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
    setMovimientoVisible(null);
    setEfectoCaptura(null);
    setLogroActivo(null);
    historialPcRef.current = [];
    setMovimientos([]);
    setLogrosDesbloqueados([]);
    setRachaZorro(0);
    setRachaGallinas(0);
    setHens(initialHens);
    setHistorialGallinas(crearHistorialInicialGallinas());
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
    setMovimientoVisible(null);
    setEfectoCaptura(null);
    setLogroActivo(null);
    historialPcRef.current = [];
    setMovimientos([]);
    setLogrosDesbloqueados([]);
    setRachaZorro(0);
    setRachaGallinas(0);
    setHens(initialHens);
    setHistorialGallinas(crearHistorialInicialGallinas());
    setFoxes(initialFoxes);
    setHensEaten(0);
    setJuegoIniciado(true);
    setMessage(modoJuego === "dos_jugadores" ? "Partida iniciada: juegan las gallinas." : "Partida iniciada. Juegan las gallinas primero.");
  };

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

          <div className="rounded-2xl bg-black/25 border border-white/10 p-3">
            <p className="text-xs font-black uppercase tracking-widest text-white/45 mb-2">Complejidad PC</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(nivelesDificultad).map(([key, nivel]) => (
                <button
                  key={key}
                  onClick={() => setDificultadPc(key)}
                  className={`rounded-xl px-2 py-2 text-xs font-black border transition-all ${dificultadPc === key ? "bg-amber-300 text-black border-amber-100" : "bg-white/5 text-white border-white/10"}`}
                >
                  {nivel.badge} {nivel.nombre}
                </button>
              ))}
            </div>
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

    if (panelMovil === "reglas") {
      return (
        <div className="space-y-3">
          <h3 className="text-xl font-black text-amber-100">Reglas rápidas</h3>
          <p className="text-sm text-white/60">Este panel reemplaza los movimientos recientes porque ayuda más durante la partida.</p>

          <div className="grid gap-2 text-sm">
            <div className="rounded-xl bg-black/25 border border-lime-300/15 px-3 py-2">🐔 Las gallinas solo avanzan hacia el gallinero.</div>
            <div className="rounded-xl bg-black/25 border border-lime-300/15 px-3 py-2">🏠 Ganan si llenan las 9 posiciones del gallinero.</div>
            <div className="rounded-xl bg-black/25 border border-orange-300/15 px-3 py-2">🦊 El zorro puede avanzar, retroceder y comer saltando.</div>
            <div className="rounded-xl bg-black/25 border border-orange-300/15 px-3 py-2">🍗 Si el zorro tiene captura, debe comer o queda soplao.</div>
            <div className="rounded-xl bg-black/25 border border-red-300/15 px-3 py-2">🚫 Si los zorros quedan atrapados sin movimiento, ganan las gallinas.</div>
          </div>

          <div className="rounded-2xl bg-amber-400/10 border border-amber-300/20 p-4 text-sm text-amber-100/80">
            Consejo: mira el brillo verde para saber a dónde puede moverse la ficha seleccionada.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h3 className="text-xl font-black text-amber-100">Estado y reglas rápidas</h3>
        <div className="rounded-2xl bg-black/30 p-4 border border-white/10"><p className="text-sm text-amber-100/85 leading-relaxed">{message}</p></div>
        <div className="grid gap-2 text-sm">
          <div className="rounded-xl bg-black/20 px-3 py-2">🐔 Las gallinas avanzan sin retroceder; arriba pueden moverse lateralmente sin repetir casillas.</div>
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


  const EfectoCapturaVisual = () => {
    if (!efectoCaptura) return null;

    return (
      <div className={`absolute inset-0 pointer-events-none z-[55] ${tableroInvertido ? "-rotate-180" : "rotate-0"}`}>
        <motion.div
          key={efectoCaptura.key}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${efectoCaptura.x}%`, top: `${efectoCaptura.y}%` }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.25, 1.8], opacity: [0, 1, 0] }}
          transition={{ duration: 0.78, ease: "easeOut" }}
        >
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-orange-400/25 border-4 border-amber-200/80 shadow-[0_0_60px_rgba(251,146,60,.9)]">
            <div className="absolute inset-3 rounded-full bg-red-500/20 border border-red-200/60 shadow-[0_0_35px_rgba(239,68,68,.8)]" />
            <div className="absolute inset-0 flex items-center justify-center text-4xl sm:text-6xl drop-shadow-2xl">💥</div>
          </div>
        </motion.div>

        {[...Array(10)].map((_, index) => (
          <motion.span
            key={`${efectoCaptura.key}-particula-${index}`}
            className="absolute w-2 h-2 rounded-full bg-amber-200 shadow-[0_0_14px_rgba(251,191,36,.95)]"
            style={{ left: `${efectoCaptura.x}%`, top: `${efectoCaptura.y}%` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos((Math.PI * 2 * index) / 10) * (28 + index * 2),
              y: Math.sin((Math.PI * 2 * index) / 10) * (28 + index * 2),
              opacity: 0,
              scale: 0.25,
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        ))}
      </div>
    );
  };

  const LogroDesbloqueado = () => {
    if (!logroActivo) return null;

    return (
      <motion.div
        key={logroActivo.key}
        initial={{ opacity: 0, y: -22, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -18, scale: 0.94 }}
        className="fixed z-[70] top-[4.7rem] left-1/2 -translate-x-1/2 w-[min(92vw,430px)] rounded-[1.6rem] bg-[#1c1008]/95 border border-amber-300/40 shadow-[0_0_55px_rgba(251,191,36,.3),0_20px_65px_rgba(0,0,0,.75)] backdrop-blur-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-300 text-black flex items-center justify-center text-3xl shadow-[0_0_28px_rgba(251,191,36,.45)]">
            {logroActivo.icono}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-200/70">Logro desbloqueado</p>
            <h3 className="text-lg font-black text-amber-100 leading-tight">{logroActivo.titulo}</h3>
            <p className="text-sm text-white/65 leading-snug">{logroActivo.detalle}</p>
          </div>
        </div>
      </motion.div>
    );
  };

  const MovimientoVisible = () => {
    if (!movimientoVisible) return null;

    const origen = nodeById[movimientoVisible.from];
    const destino = nodeById[movimientoVisible.to];
    if (!origen || !destino) return null;

    const colorLinea = movimientoVisible.piece === "zorro" ? "#fb923c" : "#bef264";
    const sombra = movimientoVisible.piece === "zorro" ? "rgba(251,146,60,.9)" : "rgba(190,242,100,.9)";
    const emoji = movimientoVisible.piece === "zorro" ? "🦊" : "🐔";

    return (
      <div className="absolute inset-0 pointer-events-none z-[45]">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.line
            x1={origen.x}
            y1={origen.y}
            x2={destino.x}
            y2={destino.y}
            stroke={colorLinea}
            strokeWidth="1.15"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0] }}
            transition={{ duration: 0.72, ease: "easeInOut" }}
            style={{ filter: `drop-shadow(0 0 8px ${sombra})` }}
          />
        </svg>

        <motion.div
          key={movimientoVisible.key}
          className={`absolute -translate-x-1/2 -translate-y-1/2 w-[8.4%] h-[8.4%] sm:w-[7.4%] sm:h-[7.4%] rounded-full flex items-center justify-center text-2xl sm:text-4xl ${tableroInvertido ? "-rotate-180" : "rotate-0"}`}
          initial={{ left: `${origen.x}%`, top: `${origen.y}%`, scale: 1, opacity: 0.95 }}
          animate={{ left: `${destino.x}%`, top: `${destino.y}%`, scale: [1, 1.28, 1.08], opacity: [0.95, 1, 0] }}
          transition={{ duration: 0.72, ease: "easeInOut" }}
          onAnimationComplete={() => setMovimientoVisible(null)}
          style={{ filter: `drop-shadow(0 0 16px ${sombra})` }}
        >
          <span className="absolute inset-0 rounded-full bg-white/15 border-4 border-white/70 shadow-[0_0_28px_rgba(255,255,255,.55)]" />
          <span className="relative drop-shadow-lg">{emoji}</span>
        </motion.div>
      </div>
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

      <AnimatePresence>
        {logroActivo && <LogroDesbloqueado />}
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

          <div className="mt-3 grid grid-cols-3 gap-2">
            {Object.entries(nivelesDificultad).map(([key, nivel]) => (
              <button
                key={key}
                onClick={() => setDificultadPc(key)}
                className={`rounded-2xl px-2 py-2 text-[11px] font-black border transition-all ${dificultadPc === key ? "bg-amber-300 text-black border-amber-100" : "bg-white/5 text-white border-white/10"}`}
              >
                {nivel.badge} {nivel.nombre}
              </button>
            ))}
          </div>

          <button onClick={comenzarPartida} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-lime-300 to-emerald-400 text-black font-black py-3 shadow-[0_0_28px_rgba(190,242,100,.28)]">
            Comenzar
          </button>
        </motion.div>
      )}

      {!juegoIniciado && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:flex fixed left-1/2 top-3 z-50 -translate-x-1/2 items-center gap-2 rounded-[2rem] bg-[#22130b]/95 border border-amber-400/25 shadow-[0_0_45px_rgba(0,0,0,.65)] backdrop-blur-xl px-3 py-2 flex-wrap justify-center max-w-[96vw]"
        >
          <span className="px-3 text-sm font-black text-amber-100 whitespace-nowrap">¿Quién serás?</span>
          <button onClick={() => prepararModo("dos_jugadores")} className={`rounded-full px-4 py-2 text-sm font-black border transition-all ${modoJuego === "dos_jugadores" ? "bg-lime-300 text-black border-lime-200" : "bg-white/5 text-white border-white/10"}`}>
            2 jugadores
          </button>
          <button onClick={() => prepararModo("humano_gallinas")} className={`rounded-full px-4 py-2 text-sm font-black border transition-all ${modoJuego === "humano_gallinas" ? "bg-lime-300 text-black border-lime-200" : "bg-white/5 text-white border-white/10"}`}>
            Soy gallina
          </button>
          <button onClick={() => prepararModo("humano_zorros")} className={`rounded-full px-4 py-2 text-sm font-black border transition-all ${modoJuego === "humano_zorros" ? "bg-orange-300 text-black border-orange-200" : "bg-white/5 text-white border-white/10"}`}>
            Soy zorro
          </button>
          <span className="px-2 text-xs font-black text-white/45 whitespace-nowrap">Nivel PC</span>
          {Object.entries(nivelesDificultad).map(([key, nivel]) => (
            <button
              key={key}
              onClick={() => setDificultadPc(key)}
              className={`rounded-full px-3 py-2 text-xs font-black border transition-all ${dificultadPc === key ? "bg-amber-300 text-black border-amber-100" : "bg-white/5 text-white border-white/10"}`}
            >
              {nivel.badge} {nivel.nombre}
            </button>
          ))}
          <button onClick={comenzarPartida} className="rounded-full bg-gradient-to-r from-lime-300 to-emerald-400 text-black font-black px-5 py-2 shadow-[0_0_24px_rgba(190,242,100,.25)]">
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
      </div>

      <div className="fixed left-1/2 bottom-3 -translate-x-1/2 z-40 sm:hidden flex items-center gap-2 rounded-full bg-black/55 border border-white/15 backdrop-blur-xl px-3 py-2 shadow-2xl">
        <span className="text-xs text-white/50">Turno</span>
        <b className="capitalize text-sm text-amber-100">{winner ? "fin" : turn}</b>
        <button onClick={resetGame} className="ml-2 rounded-full bg-amber-400 text-black px-3 py-1.5 text-xs font-black">Reiniciar</button>
      </div>

      {/* Alerta crítica reubicada:
          se muestra como chip lateral/inferior para no tapar el tablero ni interrumpir la jugada. */}
      <AnimatePresence>
        {estadoFinalIntenso && !winner && !panelMovil && (
          <motion.div
            initial={{ opacity: 0, x: -18, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -14, scale: 0.96 }}
            className={`fixed left-3 bottom-[4.85rem] z-40 sm:hidden max-w-[min(70vw,270px)] rounded-2xl px-3 py-2 text-[11px] font-black border backdrop-blur-xl shadow-[0_0_24px_rgba(0,0,0,.45)] ${estadoCriticoGallinas ? "bg-red-600/82 border-red-200/65 text-white" : "bg-amber-300/88 border-amber-100/80 text-black"}`}
          >
            {mensajeAlertaFinal}
          </motion.div>
        )}
      </AnimatePresence>

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

          <div ref={tableroRef} className={`relative mx-auto aspect-square w-[98vw] max-w-[calc(100dvh-7.4rem)] sm:w-full sm:max-w-[790px] rounded-[1.4rem] sm:rounded-[2rem] bg-[#2b190f] shadow-[inset_0_0_60px_rgba(0,0,0,.75),0_25px_70px_rgba(0,0,0,.5)] overflow-hidden border border-amber-700/40 touch-none transition-transform duration-700 ${efectoCaptura ? "scale-[1.012]" : "scale-100"} ${tableroInvertido ? "rotate-180" : "rotate-0"}` }>
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
            <MovimientoVisible />
            <EfectoCapturaVisual />

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
              const gallinaEnPeligroFinal = piece === "gallina" && estadoCriticoGallinas;
              const zorroEnAlertaFinal = piece === "zorro" && estadoCriticoZorro;

              return (
                <motion.button
                  key={n.id}
                  whileTap={{ scale: 0.94 }}
                  animate={isForcedFox ? { x: [0, 12, 0], scale: [1, 1.18, 1] } : gallinaEnPeligroFinal ? { x: [-1.5, 1.5, -1, 1, 0], scale: [1, 1.08, 1] } : zorroEnAlertaFinal ? { scale: [1, 1.12, 1], rotate: [0, -2, 2, 0] } : isTurnPiece ? { x: 0, scale: [1, 1.07, 1] } : { x: 0, scale: 1 }}
                  transition={isForcedFox ? { duration: 0.8, repeat: 1 } : gallinaEnPeligroFinal ? { duration: 0.38, repeat: Infinity, ease: "easeInOut" } : zorroEnAlertaFinal ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : isTurnPiece ? { duration: 1.25, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                  drag={puedeArrastrarFicha(n.id)}
                  dragSnapToOrigin
                  dragMomentum={false}
                  onDragStart={() => iniciarArrastre(n.id)}
                  onDragEnd={(_, info) => terminarArrastre(info)}
                  onClick={() => selectOrMove(n.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[8.4%] h-[8.4%] sm:w-[7.4%] sm:h-[7.4%] rounded-full flex items-center justify-center font-black transition-all z-20 ${tableroInvertido ? "-rotate-180" : "rotate-0"} ${isSelected ? "ring-4 ring-yellow-300 scale-110 z-30" : ""} ${isValidTarget || isForcedLanding ? "ring-4 ring-lime-300 z-30" : ""} ${isForcedHen ? "ring-4 ring-red-500 z-30" : ""} ${isPcFrom ? "ring-4 ring-sky-300 z-40" : ""} ${isPcTo ? "ring-4 ring-cyan-300 z-40" : ""} ${gallinaEnPeligroFinal ? "ring-4 ring-red-400 z-40 drop-shadow-[0_0_24px_rgba(248,113,113,.9)]" : ""} ${zorroEnAlertaFinal ? "ring-4 ring-amber-200 z-40 drop-shadow-[0_0_28px_rgba(251,191,36,.9)]" : ""} ${isTurnPiece ? turn === "gallinas" ? "drop-shadow-[0_0_18px_rgba(190,242,100,.75)]" : "drop-shadow-[0_0_20px_rgba(251,146,60,.85)]" : ""}`}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  title={`Posición ${n.id}`}
                >
                  <span className={`absolute inset-0 rounded-full border-[3px] shadow-[0_7px_18px_rgba(0,0,0,.6)] ${isPcTo ? "bg-cyan-300 border-cyan-900 animate-pulse shadow-[0_0_30px_rgba(103,232,249,.85)]" : isPcFrom ? "bg-sky-300 border-sky-900 shadow-[0_0_28px_rgba(125,211,252,.8)]" : isValidTarget || isForcedLanding ? "bg-lime-300 border-lime-900 animate-pulse shadow-[0_0_25px_rgba(190,242,100,.8)]" : gallinaEnPeligroFinal ? "bg-red-300 border-red-900 animate-pulse shadow-[0_0_32px_rgba(248,113,113,.85)]" : zorroEnAlertaFinal ? "bg-amber-200 border-orange-900 animate-pulse shadow-[0_0_34px_rgba(251,191,36,.85)]" : isTurnPiece ? turn === "gallinas" ? "bg-[#d6a35c] border-lime-300 shadow-[0_0_18px_rgba(190,242,100,.5)]" : "bg-[#d6a35c] border-orange-300 shadow-[0_0_20px_rgba(251,146,60,.6)]" : isFarm ? "bg-[#d59b57] border-[#4a2a18]" : "bg-[#c58a4a] border-[#4a2a18]"}`} />
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
                <motion.div initial={{ scale: 0.82, y: 20 }} animate={{ scale: 1, y: 0 }} className={`rounded-[2rem] bg-gradient-to-br from-amber-300 to-amber-600 text-black p-8 text-center shadow-2xl border-4 border-white/50 max-w-md transition-transform duration-700 ${tableroInvertido ? "-rotate-180" : "rotate-0"}`}>
                  <div className="text-6xl mb-3">{winner === "empate" ? "🤝" : winner === "gallinas" ? "🐔" : "🦊"}</div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-black/55 mb-2">{winner === "empate" ? "Final cerrado" : "Título desbloqueado"}</p>
                  <h2 className="text-3xl font-black">{winner === "empate" ? "Empate salvaje" : obtenerTituloVictoria(winner)}</h2>
                  <p className="mt-2 font-bold">{winner === "empate" ? "Se acabaron los movimientos. El juego estuvo intenso: pasemos a la segunda ronda para desempatar." : winner === "gallinas" ? "Las gallinas dominaron el gallinero." : "Los zorros completaron la cacería."}</p>
                  <button onClick={resetGame} className="mt-5 rounded-2xl bg-black text-white font-black px-6 py-3">Nueva partida</button>
                </motion.div>
              </motion.div>
            )}
          </div>
          {/* Firma profesional responsive */}
          <div className="absolute left-4 bottom-[4.6rem] sm:left-6 sm:bottom-5 z-30 flex items-center gap-3 sm:gap-4 opacity-75 sm:opacity-80 pointer-events-none">
            <div className="w-[2px] h-10 sm:h-14 rounded-full bg-gradient-to-b from-amber-200 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,.55)]" />
            <div className="leading-tight">
              <p className="text-[0.78rem] sm:text-[1.7rem] font-semibold text-white/90 tracking-wide">
                CEO Darling Arenas
              </p>
              <p className="text-[0.62rem] sm:text-base text-amber-100/65 tracking-wide">
                Ingeniero de Sistemas
              </p>
            </div>
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

          <AnimatePresence>
            {estadoFinalIntenso && !winner && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                className={`rounded-2xl px-4 py-3 text-sm font-black border shadow-[0_0_24px_rgba(0,0,0,.35)] ${estadoCriticoGallinas ? "bg-red-600/80 border-red-200/50 text-white" : "bg-amber-300/90 border-amber-100/70 text-black"}`}
              >
                {mensajeAlertaFinal}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl bg-black/25 border border-white/10 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-black text-white text-sm sm:text-base">Modo de partida</h3>
                <p className="hidden sm:block text-xs text-white/45 mt-1">Puedes jugar local o contra una computadora táctica, experta o leyenda.</p>
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

            <div className="mt-3 rounded-2xl bg-black/25 border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-black uppercase tracking-widest text-white/45">Complejidad PC</p>
                <span className="text-xs text-amber-100/70">{nivelesDificultad[dificultadPc]?.detalle}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(nivelesDificultad).map(([key, nivel]) => (
                  <button
                    key={key}
                    onClick={() => setDificultadPc(key)}
                    className={`rounded-xl px-2 py-2 text-xs font-black border transition-all ${dificultadPc === key ? "bg-amber-300 text-black border-amber-100 shadow-[0_0_18px_rgba(251,191,36,.25)]" : "bg-white/5 text-white border-white/10"}`}
                  >
                    {nivel.badge} {nivel.nombre}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={comenzarPartida}
              className={`mt-3 w-full rounded-2xl px-4 py-3 font-black border transition-all ${juegoIniciado ? "bg-white/10 text-white/60 border-white/10" : "bg-gradient-to-r from-lime-300 to-emerald-400 text-black border-lime-200 shadow-[0_0_28px_rgba(190,242,100,.28)]"}`}
            >
              {juegoIniciado ? "Partida en curso" : "Comenzar"}
            </button>

            <p className="mt-3 text-xs text-white/45">La PC ahora tiene 3 niveles libres: Difícil, Experto y Leyenda. Los títulos se desbloquean al ganar.</p>
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
              <h3 className="font-black text-white">Objetivo rápido</h3>
              <span className="text-xs text-lime-200/70">GUÍA</span>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="rounded-xl bg-lime-300/10 border border-lime-300/15 px-3 py-2 text-lime-50">🐔 Gallinas: llenar las 9 casillas del gallinero.</div>
              <div className="rounded-xl bg-orange-300/10 border border-orange-300/15 px-3 py-2 text-orange-50">🦊 Zorros: comer 12 gallinas para ganar.</div>
              <div className="rounded-xl bg-red-300/10 border border-red-300/15 px-3 py-2 text-red-50">💨 Si un zorro no come teniendo captura, queda soplao.</div>
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
              <div className="rounded-xl bg-black/20 px-3 py-2">🐔 Las gallinas avanzan sin retroceder; arriba pueden moverse lateralmente sin repetir casillas.</div>
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
























