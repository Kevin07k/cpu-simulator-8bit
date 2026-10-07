/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Controlador Principal, Persistencia y Macros (Main Entrypoint)
 * ============================================================================
 * Conecta los botones y menús de Google Sheets con el motor del CPU.
 * Gestiona la persistencia de estado entre ejecuciones mediante PropertiesService.
 */

// Claves para almacenamiento de estado persistente en Google Apps Script
const STORAGE_KEY_STATE = 'CPU_STATE_SNAPSHOT';
const STORAGE_KEY_RAM = 'CPU_RAM_SNAPSHOT';
const STORAGE_KEY_LOGS = 'CPU_LOGS_SNAPSHOT';

/**
 * Función Principal (main): Ejecuta la construcción completa del simulador.
 */
function main() {
  btnSetupSheet();
}

/**
 * Evento disparador al abrir la hoja de cálculo: Crea el menú superior interactivo.
 */
function onOpen(e) {
  try {
    const ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.createMenu('⚙️ Simulador CPU 8-Bit')
        .addItem('🛠️ Formatear / Reiniciar Hojas (Setup)', 'btnSetupSheet')
        .addSeparator()
        .addItem('⏯️ Paso a Paso: Micro-fase (Step Phase)', 'btnStepPhase')
        .addItem('⏭️ Paso a Paso: Instrucción Completa (Step Instr)', 'btnStepInstruction')
        .addItem('▶️ Ejecutar Programa Completo (Run)', 'btnRunContinuous')
        .addItem('🔄 Reset de CPU y Registros', 'btnReset')
        .addSeparator()
        .addItem('📂 Cargar Programa: Serie de Fibonacci', 'btnLoadFibonacci')
        .addItem('📂 Cargar Programa: Multiplicación Aritmética', 'btnLoadMultiplication')
        .addSeparator()
        .addItem('📋 Ver Pestaña de Logs y Auditoría', 'btnShowLogsSheet')
        .addItem('🏠 Ver Pestaña del Simulador Principal', 'btnShowSimulatorSheet')
        .addToUi();
    }
  } catch (err) {
    console.log('onOpen finalizado. Nota: El menú visual se muestra al abrir la hoja de cálculo de Google Sheets.');
  }
}

/**
 * Evento disparador al editar la hoja: Maneja los clics en las casillas de control.
 */
function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const ui = getUI();

  const a1 = e.range.getA1Notation();
  const val = e.value;

  // 1. Detección de edición manual directa en la matriz de memoria RAM (I6:X21)
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (sheetName === ui.SHEET_NAME && row >= 6 && row <= 21 && col >= 9 && col <= 24) {
    const addr = (row - 6) * 16 + (col - 9);
    let numVal = 0;
    if (typeof val === 'number') {
      numVal = Math.floor(val) & 0xFF;
    } else {
      const cleanStr = String(val !== undefined && val !== null ? val : '').trim().replace(/^0x/i, '');
      numVal = parseInt(cleanStr, 16);
      if (isNaN(numVal)) numVal = 0;
    }
    const hexStr = Memory.toHex8(numVal);
    e.range.setValue(hexStr); // Normaliza a formato hex de 2 dígitos (ej: '8' -> '08')
    const mem = getMemory();
    mem.bytes[addr] = numVal;
    saveState();
    return;
  }

  // 2. Si se marcó una casilla (TRUE), ejecutar la acción correspondiente y desmarcarla
  if (val === 'TRUE' || val === true) {
    e.range.setValue(false); // Reset automático de la casilla

    // 1. Acciones desde la pestaña dedicada de Logs
    if (sheetName === ui.LOGS_SHEET_NAME) {
      if (a1 === 'B2') {
        btnShowSimulatorSheet();
      } else if (a1 === 'F2') {
        btnClearLogsSheet();
      }
      return;
    }

    // 2. Acciones desde la pestaña principal del Simulador
    if (sheetName === ui.SHEET_NAME) {
      if (e.range.getRow() >= 30) {
        ui.cleanGhostCheckboxes(sheet);
      }
      if (a1 === 'B27' || a1 === 'B32') {
        btnStepPhase();
      } else if (a1 === 'F27' || a1 === 'F32') {
        btnStepInstruction();
      } else if (a1 === 'K27' || a1 === 'K32') {
        btnRunContinuous();
      } else if (a1 === 'P27' || a1 === 'P32') {
        btnReset();
      } else if (a1 === 'B29' || a1 === 'B34') {
        btnLoadFibonacci();
      } else if (a1 === 'F29' || a1 === 'F34') {
        btnLoadMultiplication();
      } else if (a1 === 'K29' || a1 === 'K34') {
        btnSetupSheet();
      } else if (a1 === 'P29') {
        btnShowLogsSheet();
      }
    }
  }
}

/**
 * Guarda el estado actual del CPU, la RAM y los Logs en las propiedades del script.
 */
function saveState() {
  const reg = getRegisters();
  const mem = getMemory();
  const cpu = getCPU();
  const log = getLogger();

  const props = PropertiesService.getScriptProperties();
  const stateObj = {
    pc: reg.PC,
    ir: reg.IR,
    mar: reg.MAR,
    mdr: reg.MDR,
    ax: reg.AX,
    bx: reg.BX,
    zf: reg.ZF,
    cf: reg.CF,
    sf: reg.SF,
    phase: cpu.currentPhase,
    isHalted: cpu.isHalted,
    cycleCount: cpu.cycleCount,
    instructionCount: cpu.instructionCount,
    currentInstruction: cpu.currentInstruction,
    operandByte: cpu.operandByte,
    storeTarget: cpu.storeTarget
  };

  props.setProperty(STORAGE_KEY_STATE, JSON.stringify(stateObj));
  props.setProperty(STORAGE_KEY_RAM, JSON.stringify(Array.from(mem.bytes)));
  props.setProperty(STORAGE_KEY_LOGS, JSON.stringify(log.serialize()));
}

/**
 * Restaura el estado del CPU, la RAM y los Logs desde las propiedades del script.
 */
function loadState() {
  const reg = getRegisters();
  const mem = getMemory();
  const cpu = getCPU();
  const log = getLogger();

  const props = PropertiesService.getScriptProperties();
  const stateStr = props.getProperty(STORAGE_KEY_STATE);
  const ramStr = props.getProperty(STORAGE_KEY_RAM);
  const logsStr = props.getProperty(STORAGE_KEY_LOGS);

  if (ramStr) {
    const rawArr = JSON.parse(ramStr);
    for (let i = 0; i < rawArr.length; i++) {
      mem.bytes[i] = rawArr[i];
    }
  }

  // Sincronización en vivo desde la matriz de RAM en la hoja (I6:X21)
  // Permite que cualquier modificación manual de datos o código en pantalla sea respetada de inmediato
  try {
    const sheet = getUI().getSheet();
    if (sheet) {
      const ramGrid = sheet.getRange('I6:X21').getValues();
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          const addr = (r * 16) + c;
          const raw = ramGrid[r][c];
          if (raw !== '' && raw !== null && raw !== undefined) {
            let numVal = 0;
            if (typeof raw === 'number') {
              numVal = Math.floor(raw) & 0xFF;
            } else {
              const clean = String(raw).trim().replace(/^0x/i, '');
              numVal = parseInt(clean, 16);
              if (isNaN(numVal)) numVal = 0;
            }
            mem.bytes[addr] = numVal & 0xFF;
          }
        }
      }
    }
  } catch (e) {
    console.log('Aviso sincronizando RAM desde la hoja: ' + e);
  }

  if (logsStr) {
    try {
      log.deserialize(JSON.parse(logsStr));
    } catch (e) {
      // Ignorar si el formato es antiguo
    }
  }

  if (stateStr) {
    const s = JSON.parse(stateStr);
    reg.PC = s.pc;
    reg.IR = s.ir;
    reg.MAR = s.mar;
    reg.MDR = s.mdr;
    reg.AX = s.ax;
    reg.BX = s.bx;
    reg.ZF = s.zf;
    reg.CF = s.cf;
    reg.SF = s.sf;

    cpu.currentPhase = s.phase || CPU_PHASES.FETCH;
    cpu.isHalted = s.isHalted || false;
    cpu.cycleCount = s.cycleCount || 0;
    cpu.instructionCount = s.instructionCount || 0;
    cpu.currentInstruction = s.currentInstruction || null;
    cpu.operandByte = s.operandByte !== undefined ? s.operandByte : null;
    cpu.storeTarget = s.storeTarget || null;
  }
}

// ============================================================================
// FUNCIONES DE CONTROL VINCULADAS A BOTONES Y MENÚS DE GOOGLE SHEETS
// ============================================================================

/**
 * Macro: Formatear y construir la interfaz gráfica completa en Google Sheets con un solo clic.
 * Genera la cuadrícula 16x16, el panel de registros, los botones interactivos y precarga el programa de prueba.
 */
function btnSetupSheet() {
  const mem = getMemory();
  const reg = getRegisters();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  mem.reset();
  reg.reset();
  cpu.reset();
  log.clear();

  // 1. Construir la estructura visual, colores, anchos y casillas de control
  ui.formatSheet();

  // 2. Precargar automáticamente el programa de la Serie de Fibonacci
  const prog = DemoPrograms.getFibonacciProgram();
  mem.loadProgram(prog, 0x00);
  log.log('Interfaz construida y programa Fibonacci precargado en 0x00.', 'SETUP');

  // 3. Persistir y renderizar el estado inicial completo
  saveState();
  ui.renderCycle(cpu, log);

  const sheet = ui.getSheet();
  const url = sheet.getParent().getUrl();
  console.log('✅ Interfaz y datos inicializados al 100%.');
  console.log('📄 Enlace directo a tu Google Sheet: ' + url);
}

/**
 * Macro: Cargar en memoria el programa de la Serie de Fibonacci.
 */
function btnLoadFibonacci() {
  const mem = getMemory();
  const reg = getRegisters();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  mem.reset();
  reg.reset();
  cpu.reset();
  log.clear();

  const prog = DemoPrograms.getFibonacciProgram();
  mem.loadProgram(prog, 0x00);
  log.log(`Programa Fibonacci cargado (${prog.length} bytes en 0x00)`, 'LOAD');

  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Macro: Cargar en memoria el programa de Multiplicación por sumas sucesivas.
 */
function btnLoadMultiplication() {
  const mem = getMemory();
  const reg = getRegisters();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  mem.reset();
  reg.reset();
  cpu.reset();
  log.clear();

  const prog = DemoPrograms.getMultiplicationProgram();
  mem.loadProgram(prog, 0x00);
  log.log(`Programa Multiplicación cargado (${prog.length} bytes en 0x00)`, 'LOAD');

  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Obtiene métricas extendidas y desensamblado del ciclo actual para auditoría.
 * @param {CPU} cpu
 * @returns {Object}
 */
function getCycleSnapshotExtra(cpu) {
  const snap = cpu.registers.getSnapshot();
  const cu = cpu.controlUnit;
  return {
    step: cpu.cycleCount,
    instruction: cu.disassemble(cpu.registers.IR, cpu.operandByte),
    pc: `0x${snap.PC.hex}`,
    ir: `0x${snap.IR.hex}`,
    mar: `0x${snap.MAR.hex}`,
    mdr: `0x${snap.MDR.hex}`,
    ax: `0x${snap.AX.hex} (${snap.AX.signed >= 0 ? '+' : ''}${snap.AX.signed})`,
    bx: `0x${snap.BX.hex} (${snap.BX.signed >= 0 ? '+' : ''}${snap.BX.signed})`,
    flags: `ZF=${snap.FLAGS.ZF} CF=${snap.FLAGS.CF} SF=${snap.FLAGS.SF}`
  };
}

/**
 * Macro: Ejecutar una sola micro-fase del ciclo (Fetch, Decode, Execute, Store).
 */
function btnStepPhase() {
  loadState();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  if (cpu.isHalted) {
    log.log('Aviso: El CPU está detenido (HLT). Presione RESET para reiniciar.', 'HALT', getCycleSnapshotExtra(cpu));
    saveState();
    ui.renderCycle(cpu, log);
    return;
  }

  const state = cpu.stepPhase();
  log.log(state.lastLog, state.phase, getCycleSnapshotExtra(cpu));

  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Macro: Ejecutar las 4 fases de una instrucción completa registrando cada micro-operación.
 */
function btnStepInstruction() {
  loadState();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  if (cpu.isHalted) {
    log.log('Aviso: El CPU está detenido (HLT). Presione RESET para reiniciar.', 'HALT', getCycleSnapshotExtra(cpu));
    saveState();
    ui.renderCycle(cpu, log);
    return;
  }

  const startCount = cpu.instructionCount;
  let guard = 0;
  while (cpu.instructionCount === startCount && !cpu.isHalted && guard < 10) {
    const state = cpu.stepPhase();
    log.log(state.lastLog, state.phase, getCycleSnapshotExtra(cpu));
    guard++;
  }

  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Macro: Ejecución continua secuencial del programa completo con registro de traza.
 */
function btnRunContinuous() {
  loadState();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  if (cpu.isHalted) {
    log.log('Aviso: El CPU está detenido (HLT). Presione RESET antes de ejecutar.', 'HALT', getCycleSnapshotExtra(cpu));
    saveState();
    ui.renderCycle(cpu, log);
    return;
  }

  const MAX_CYCLES = 650; // Permite completar las 12 iteraciones de Fibonacci hasta HLT (0xE9)
  let cycles = 0;

  while (!cpu.isHalted && cycles < MAX_CYCLES) {
    const state = cpu.stepPhase();
    log.log(state.lastLog, state.phase, getCycleSnapshotExtra(cpu));
    cycles++;
  }

  log.log(`Ejecución continua finalizada (${cycles} ciclos)`, 'RUN', getCycleSnapshotExtra(cpu));
  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Macro: Reinicia registros, puntero de instrucción y banderas a cero.
 */
function btnReset() {
  loadState();
  const reg = getRegisters();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  reg.reset();
  cpu.reset();
  log.log('Registros y CPU restablecidos a 0x00. Memoria preservada.', 'RESET', getCycleSnapshotExtra(cpu));

  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Macro: Cambia la vista activa a la pestaña dedicada de Logs y Auditoría.
 */
function btnShowLogsSheet() {
  try {
    getUI().getLogsSheet().activate();
  } catch (e) {
    console.log('Error abriendo pestaña de logs: ' + e);
  }
}

/**
 * Macro: Cambia la vista activa a la pestaña principal del Simulador CPU.
 */
function btnShowSimulatorSheet() {
  try {
    getUI().getSheet().activate();
  } catch (e) {
    console.log('Error abriendo pestaña del simulador: ' + e);
  }
}

/**
 * Macro: Limpia el historial acumulativo en la pestaña dedicada de Logs y Auditoría.
 */
function btnClearLogsSheet() {
  try {
    const ui = getUI();
    const log = getLogger();
    const cpu = getCPU();

    ui.clearDedicatedLogs();
    log.clear();
    saveState();
    ui.renderCycle(cpu, log);
    console.log('🧹 Historial de logs limpiado exitosamente.');
  } catch (e) {
    console.log('Error limpiando historial de logs: ' + e);
  }
}