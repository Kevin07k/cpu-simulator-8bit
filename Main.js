/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Controlador Principal, Persistencia y Macros (Main Entrypoint)
 * ============================================================================
 * Conecta los botones y menús de Google Sheets con el motor del CPU.
 * Gestiona la persistencia de estado entre ejecuciones mediante PropertiesService.
 */

// Clave para almacenamiento de estado persistente en Google Apps Script
const STORAGE_KEY_STATE = 'CPU_STATE_SNAPSHOT';
const STORAGE_KEY_RAM = 'CPU_RAM_SNAPSHOT';

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
        .addItem('🛠️ Formatear / Reiniciar Hoja (Setup)', 'btnSetupSheet')
        .addSeparator()
        .addItem('⏯️ Paso a Paso: Micro-fase (Step Phase)', 'btnStepPhase')
        .addItem('⏭️ Paso a Paso: Instrucción Completa (Step Instr)', 'btnStepInstruction')
        .addItem('▶️ Ejecutar Programa Completo (Run)', 'btnRunContinuous')
        .addItem('🔄 Reset de CPU y Registros', 'btnReset')
        .addSeparator()
        .addItem('📂 Cargar Programa: Serie de Fibonacci', 'btnLoadFibonacci')
        .addItem('📂 Cargar Programa: Multiplicación Aritmética', 'btnLoadMultiplication')
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
  if (sheet.getName() !== globalUI.SHEET_NAME) return;

  const a1 = e.range.getA1Notation();
  const val = e.value;

  // Si se marcó una casilla (TRUE), ejecutar la acción correspondiente y desmarcarla
  if (val === 'TRUE' || val === true) {
    e.range.setValue(false); // Reset automático de la casilla

    if (a1 === 'B32') {
      btnStepPhase();
    } else if (a1 === 'F32') {
      btnStepInstruction();
    } else if (a1 === 'K32') {
      btnRunContinuous();
    } else if (a1 === 'P32') {
      btnReset();
    } else if (a1 === 'B34') {
      btnLoadFibonacci();
    } else if (a1 === 'F34') {
      btnLoadMultiplication();
    } else if (a1 === 'K34') {
      btnSetupSheet();
    }
  }
}

/**
 * Guarda el estado actual del CPU y la RAM en las propiedades del script.
 */
function saveState() {
  const reg = getRegisters();
  const mem = getMemory();
  const cpu = getCPU();

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
}

/**
 * Restaura el estado del CPU y la RAM desde las propiedades del script.
 */
function loadState() {
  const reg = getRegisters();
  const mem = getMemory();
  const cpu = getCPU();

  const props = PropertiesService.getScriptProperties();
  const stateStr = props.getProperty(STORAGE_KEY_STATE);
  const ramStr = props.getProperty(STORAGE_KEY_RAM);

  if (ramStr) {
    const rawArr = JSON.parse(ramStr);
    for (let i = 0; i < rawArr.length; i++) {
      mem.bytes[i] = rawArr[i];
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
 * Macro: Ejecutar una sola micro-fase del ciclo (Fetch, Decode, Execute, Store).
 */
function btnStepPhase() {
  loadState();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  if (cpu.isHalted) {
    console.log('Aviso: El CPU está detenido (HLT). Presione RESET para reiniciar.');
    return;
  }

  const state = cpu.stepPhase();
  log.log(state.lastLog, state.phase);

  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Macro: Ejecutar las 4 fases de una instrucción completa.
 */
function btnStepInstruction() {
  loadState();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  if (cpu.isHalted) {
    console.log('Aviso: El CPU está detenido (HLT). Presione RESET para reiniciar.');
    return;
  }

  const state = cpu.stepInstruction();
  log.log(state.lastLog, 'STORE');

  saveState();
  ui.renderCycle(cpu, log);
}

/**
 * Macro: Ejecución continua secuencial del programa completo.
 */
function btnRunContinuous() {
  loadState();
  const cpu = getCPU();
  const log = getLogger();
  const ui = getUI();

  if (cpu.isHalted) {
    console.log('Aviso: El CPU está detenido (HLT). Presione RESET antes de ejecutar.');
    return;
  }

  const MAX_CYCLES = 350; // Guardia de seguridad contra bucles infinitos
  let cycles = 0;

  while (!cpu.isHalted && cycles < MAX_CYCLES) {
    cpu.stepPhase();
    cycles++;
  }

  log.log(`Ejecución continua finalizada (${cycles} ciclos procesados)`, 'RUN');
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
  log.clear();
  log.log('Registros y CPU restablecidos a 0x00. Memoria preservada.', 'RESET');

  saveState();
  ui.renderCycle(cpu, log);
}