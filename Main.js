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
 * Evento disparador al abrir la hoja de cálculo: Crea el menú superior interactivo.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
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

/**
 * Guarda el estado actual del CPU y la RAM en las propiedades del script.
 */
function saveState() {
  const props = PropertiesService.getScriptProperties();
  const stateObj = {
    pc: globalRegisters.PC,
    ir: globalRegisters.IR,
    mar: globalRegisters.MAR,
    mdr: globalRegisters.MDR,
    ax: globalRegisters.AX,
    bx: globalRegisters.BX,
    zf: globalRegisters.ZF,
    cf: globalRegisters.CF,
    sf: globalRegisters.SF,
    phase: globalCPU.currentPhase,
    isHalted: globalCPU.isHalted,
    cycleCount: globalCPU.cycleCount,
    instructionCount: globalCPU.instructionCount,
    currentInstruction: globalCPU.currentInstruction,
    operandByte: globalCPU.operandByte,
    storeTarget: globalCPU.storeTarget
  };

  props.setProperty(STORAGE_KEY_STATE, JSON.stringify(stateObj));
  props.setProperty(STORAGE_KEY_RAM, JSON.stringify(Array.from(globalMemory.bytes)));
}

/**
 * Restaura el estado del CPU y la RAM desde las propiedades del script.
 */
function loadState() {
  const props = PropertiesService.getScriptProperties();
  const stateStr = props.getProperty(STORAGE_KEY_STATE);
  const ramStr = props.getProperty(STORAGE_KEY_RAM);

  if (ramStr) {
    const rawArr = JSON.parse(ramStr);
    for (let i = 0; i < rawArr.length; i++) {
      globalMemory.bytes[i] = rawArr[i];
    }
  }

  if (stateStr) {
    const s = JSON.parse(stateStr);
    globalRegisters.PC = s.pc;
    globalRegisters.IR = s.ir;
    globalRegisters.MAR = s.mar;
    globalRegisters.MDR = s.mdr;
    globalRegisters.AX = s.ax;
    globalRegisters.BX = s.bx;
    globalRegisters.ZF = s.zf;
    globalRegisters.CF = s.cf;
    globalRegisters.SF = s.sf;

    globalCPU.currentPhase = s.phase || CPU_PHASES.FETCH;
    globalCPU.isHalted = s.isHalted || false;
    globalCPU.cycleCount = s.cycleCount || 0;
    globalCPU.instructionCount = s.instructionCount || 0;
    globalCPU.currentInstruction = s.currentInstruction || null;
    globalCPU.operandByte = s.operandByte !== undefined ? s.operandByte : null;
    globalCPU.storeTarget = s.storeTarget || null;
  }
}

// ============================================================================
// FUNCIONES DE CONTROL VINCULADAS A BOTONES Y MENÚS DE GOOGLE SHEETS
// ============================================================================

/**
 * Macro: Formatear y construir la interfaz gráfica en Google Sheets.
 */
function btnSetupSheet() {
  globalMemory.reset();
  globalRegisters.reset();
  globalCPU.reset();
  globalLogger.clear();
  globalLogger.log('Estructura visual e inicialización completada', 'SETUP');

  saveState();
  globalUI.formatSheet();
}

/**
 * Macro: Ejecutar una sola micro-fase del ciclo (Fetch, Decode, Execute, Store).
 */
function btnStepPhase() {
  loadState();

  if (globalCPU.isHalted) {
    SpreadsheetApp.getUi().alert('Aviso del Simulador', 'El CPU está detenido (HLT). Presione RESET para reiniciar.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const state = globalCPU.stepPhase();
  globalLogger.log(state.lastLog, state.phase);

  saveState();
  globalUI.renderCycle(globalCPU, globalLogger);
}

/**
 * Macro: Ejecutar las 4 fases de una instrucción completa.
 */
function btnStepInstruction() {
  loadState();

  if (globalCPU.isHalted) {
    SpreadsheetApp.getUi().alert('Aviso del Simulador', 'El CPU está detenido (HLT). Presione RESET para reiniciar.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const state = globalCPU.stepInstruction();
  globalLogger.log(state.lastLog, 'STORE');

  saveState();
  globalUI.renderCycle(globalCPU, globalLogger);
}

/**
 * Macro: Ejecución continua secuencial del programa completo.
 */
function btnRunContinuous() {
  loadState();

  if (globalCPU.isHalted) {
    SpreadsheetApp.getUi().alert('Aviso del Simulador', 'El CPU está detenido (HLT). Presione RESET antes de ejecutar.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const MAX_CYCLES = 250; // Guardia de seguridad contra bucles infinitos
  let cycles = 0;

  while (!globalCPU.isHalted && cycles < MAX_CYCLES) {
    globalCPU.stepPhase();
    cycles++;
  }

  globalLogger.log(`Ejecución continua finalizada (${cycles} ciclos procesados)`, 'RUN');
  saveState();
  globalUI.renderCycle(globalCPU, globalLogger);
}

/**
 * Macro: Reinicia registros, puntero de instrucción y banderas a cero.
 */
function btnReset() {
  loadState();

  globalRegisters.reset();
  globalCPU.reset();
  globalLogger.clear();
  globalLogger.log('Registros y CPU restablecidos a 0x00. Memoria preservada.', 'RESET');

  saveState();
  globalUI.renderCycle(globalCPU, globalLogger);
}
