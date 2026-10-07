/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Interfaz Gráfica de Usuario en Google Sheets (UI Renderer)
 * ============================================================================
 * Genera y actualiza dinámicamente la cuadrícula matricial 16x16 de RAM,
 * el panel de control de registros, buses y el visor de micro-operaciones.
 */

class UIRenderer {
  constructor() {
    this.SHEET_NAME = 'Simulador_CPU_8bit';
    this.LOGS_SHEET_NAME = 'Logs_MicroOperaciones';
    
    // Paleta de Colores de Alto Rendimiento y Fases del CPU
    this.COLORS = {
      HEADER_BG: '#1E293B',       // Azul pizarra oscuro
      HEADER_TEXT: '#FFFFFF',
      CODE_SEG_BG: '#F1F5F9',     // Gris azulado claro (Segmento Código: 00h-7Fh)
      DATA_SEG_BG: '#ECFDF5',     // Verde esmeralda suave (Segmento Datos: 80h-FFh)
      HIGHLIGHT_FETCH: '#FEF08A', // Amarillo dorado (Lectura / Fetch)
      HIGHLIGHT_WRITE: '#A5F3FC', // Cian brillante (Escritura / Store)
      HIGHLIGHT_PC: '#FED7AA',    // Naranja suave (Puntero PC)
      BORDER: '#CBD5E1',
      FLAG_ON: '#22C55E',         // Verde activo
      FLAG_OFF: '#E2E8F0',        // Gris inactivo
      TEXT_DARK: '#0F172A',
      TEXT_MUTED: '#64748B'
    };

    // Estilos Visuales por Micro-fase (Alineados al temario de Arquitectura)
    this.PHASE_STYLES = {
      FETCH: {
        bg: '#EFF6FF',      // Azul claro
        text: '#1D4ED8',    // Azul oscuro
        badge: '🔵 FETCH'
      },
      DECODE: {
        bg: '#FFFBEB',      // Ámbar claro
        text: '#B45309',    // Ámbar oscuro
        badge: '🟠 DECODE'
      },
      EXECUTE: {
        bg: '#ECFDF5',      // Verde esmeralda claro
        text: '#047857',    // Verde oscuro
        badge: '🟢 EXECUTE'
      },
      STORE: {
        bg: '#FAF5FF',      // Púrpura claro
        text: '#6D28D9',    // Púrpura oscuro
        badge: '🟣 STORE'
      },
      HALT: {
        bg: '#FEF2F2',      // Rojo suave
        text: '#B91C1C',    // Rojo
        badge: '🔴 HALT'
      },
      DEFAULT: {
        bg: '#F8FAFC',      // Slate suave
        text: '#334155',    // Slate oscuro
        badge: '⚪ INFO'
      }
    };
  }

  /**
   * Obtiene o crea la hoja principal para la simulación.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getSheet() {
    let ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }

    if (!ss) {
      const files = DriveApp.getFilesByName('Simulador CPU 8-Bit (von Neumann)');
      if (files.hasNext()) {
        ss = SpreadsheetApp.open(files.next());
      } else {
        ss = SpreadsheetApp.create('Simulador CPU 8-Bit (von Neumann)');
      }
    }

    let sheet = ss.getSheetByName(this.SHEET_NAME);
    if (!sheet) {
      sheet = ss.getActiveSheet();
      try {
        sheet.setName(this.SHEET_NAME);
      } catch (e) {
        sheet = ss.insertSheet(this.SHEET_NAME);
      }
    }

    return sheet;
  }

  /**
   * Obtiene o crea la hoja secundaria dedicada exclusivamente a los Logs y Auditoría.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getLogsSheet() {
    const mainSheet = this.getSheet();
    const ss = mainSheet.getParent();
    let logsSheet = ss.getSheetByName(this.LOGS_SHEET_NAME);
    if (!logsSheet) {
      logsSheet = ss.insertSheet(this.LOGS_SHEET_NAME);
    }
    return logsSheet;
  }

  /**
   * Formatea la hoja secundaria dedicada para el registro histórico extendido.
   */
  formatLogsSheet() {
    const sheet = this.getLogsSheet();
    sheet.clear();
    sheet.setHiddenGridlines(false);
    sheet.setFrozenRows(4); // Fija cabeceras para scroll infinito cómodo

    // 1. TÍTULO Y BANNER SUPERIOR
    sheet.getRange('B1:M1').merge()
      .setValue('AUDITORÍA Y REGISTRO CRONOLÓGICO DE MICRO-OPERACIONES (RTL & BUSES)')
      .setFontFamily('Consolas')
      .setFontSize(13)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground(this.COLORS.HEADER_BG)
      .setFontColor('#38BDF8');

    // Botón para volver al simulador principal
    sheet.getRange('B2').insertCheckboxes();
    sheet.getRange('C2:E2').merge()
      .setValue('🏠 Volver al Simulador CPU')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#E0F2FE')
      .setFontColor('#0369A1');

    // Botón para limpiar historial de logs
    sheet.getRange('F2').insertCheckboxes();
    sheet.getRange('G2:H2').merge()
      .setValue('🧹 Limpiar Historial')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#FEE2E2')
      .setFontColor('#B91C1C');

    sheet.getRange('I2:M2').merge()
      .setValue('UCB "San Pablo" | Historial acumulativo infinito (sin límite de pasos)')
      .setFontFamily('Consolas')
      .setFontSize(9)
      .setHorizontalAlignment('center')
      .setBackground('#334155')
      .setFontColor('#94A3B8');

    // 2. CABECERAS DE COLUMNAS (Fila 4)
    const logHeaders = [
      ['PASO #', 'HORA', 'FASE', 'INSTRUCCIÓN', 'DETALLE DE LA MICRO-OPERACIÓN (RTL / BUSES / ALU)', 'PC', 'IR', 'MAR', 'MDR', 'AX (Acumulador)', 'BX (Base)', 'BANDERAS (FLAGS)']
    ];
    sheet.getRange('B4:M4').setValues(logHeaders)
      .setFontFamily('Consolas')
      .setFontSize(9)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#CBD5E1');

    // Ajustar anchos generosos para legibilidad impecable
    sheet.setColumnWidth(1, 15);  // Col A (Margen)
    sheet.setColumnWidth(2, 65);  // Col B (#)
    sheet.setColumnWidth(3, 85);  // Col C (Hora)
    sheet.setColumnWidth(4, 115); // Col D (Fase)
    sheet.setColumnWidth(5, 160); // Col E (Instrucción)
    sheet.setColumnWidth(6, 420); // Col F (Detalle RTL - súper espacioso)
    sheet.setColumnWidth(7, 65);  // Col G (PC)
    sheet.setColumnWidth(8, 65);  // Col H (IR)
    sheet.setColumnWidth(9, 65);  // Col I (MAR)
    sheet.setColumnWidth(10, 65); // Col J (MDR)
    sheet.setColumnWidth(11, 110); // Col K (AX)
    sheet.setColumnWidth(12, 110); // Col L (BX)
    sheet.setColumnWidth(13, 160); // Col M (FLAGS)
  }

  /**
   * Limpia todas las filas de logs acumuladas en la hoja secundaria.
   */
  clearDedicatedLogs() {
    try {
      const sheet = this.getLogsSheet();
      const lastRow = sheet.getLastRow();
      if (lastRow >= 5) {
        sheet.getRange(5, 2, lastRow - 4, 12).clear();
      }
    } catch (e) {
      console.log('Error limpiando logs dedicados: ' + e);
    }
  }

  /**
   * Inicializa la estructura visual completa de la hoja (Setup / Format).
   */
  formatSheet() {
    const sheet = this.getSheet();
    sheet.activate();
    sheet.clear();
    sheet.setHiddenGridlines(false);

    // Formatear también la pestaña dedicada de logs
    this.formatLogsSheet();

    // Volver a activar la pestaña principal para el usuario
    sheet.activate();

    // 1. TÍTULO Y BANNER SUPERIOR (Filas 1 y 2)
    sheet.getRange('B1:X1').merge()
      .setValue('SIMULADOR DE CPU VON NEUMANN (8 BITS) — ARQUITECTURA X86')
      .setFontFamily('Consolas')
      .setFontSize(13)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground(this.COLORS.HEADER_BG)
      .setFontColor(this.COLORS.HEADER_TEXT);

    sheet.getRange('B2:X2').merge()
      .setValue('UCB "San Pablo" | SIS-131: Arquitectura de Computadoras | Docente: Ing. Paulo César Loayza')
      .setFontFamily('Consolas')
      .setFontSize(9)
      .setHorizontalAlignment('center')
      .setBackground('#334155')
      .setFontColor('#94A3B8');

    // 2. PANEL DE REGISTROS (Columnas B a G, Filas 4 a 11)
    sheet.getRange('B4:G4').merge()
      .setValue('DASHBOARD DEL PROCESADOR Y REGISTROS INTERNOS')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#38BDF8')
      .setHorizontalAlignment('center');

    const regHeaders = [
      ['REGISTRO', 'VALOR (HEX)', 'BINARIO (8-BIT)', 'DECIMAL (VALOR)', 'ESTADO', 'INFO / ASM'],
      ['PC (Program Counter)', '0x00', '00000000', '0', 'IDLE', 'Puntero Inst.'],
      ['IR (Instruction Reg)', '0x00', '00000000', '0', 'NOP', 'Opcode Actual'],
      ['MAR (Memory Address)', '0x00', '00000000', '0', 'READY', 'Bus Direcciones'],
      ['MDR (Memory Data)',    '0x00', '00000000', '0', 'READY', 'Bus de Datos'],
      ['AX (Acumulador)',      '0x00', '00000000', '0 (+0)', 'READY', 'Registro AX'],
      ['BX (Propósito Gral)',  '0x00', '00000000', '0 (+0)', 'READY', 'Registro BX']
    ];
    sheet.getRange('B5:G11').setValues(regHeaders)
      .setFontFamily('Consolas')
      .setFontSize(9);
    sheet.getRange('B5:G5').setFontWeight('bold').setBackground('#E2E8F0').setHorizontalAlignment('center');
    sheet.getRange('B6:B11').setFontWeight('bold');

    // Banderas de Estado (FLAGS)
    sheet.getRange('B12:G12').merge()
      .setValue('BANDERAS DE ESTADO: ZF = 0  |  CF = 0  |  SF = 0   [Ciclos: 0 | Instrucciones: 0]')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#F8FAFC')
      .setBorder(true, true, true, true, false, false);

    // 3. MONITOR EN VIVO (ÚLTIMAS MICRO-OPERACIONES) (Filas 14 a 20)
    sheet.getRange('B14:G14').merge()
      .setValue('MONITOR EN VIVO (ÚLTIMAS MICRO-OPERACIONES)')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#A7F3D0')
      .setHorizontalAlignment('center');

    sheet.getRange('B15:G15').setValues([['HORA', 'FASE', 'MICRO-OPERACIÓN ACTIVA (RTL / BUSES)', '', '', '']])
      .setFontFamily('Consolas')
      .setFontSize(9)
      .setFontWeight('bold')
      .setBackground('#E2E8F0');
    sheet.getRange('D15:G15').merge();

    // Rellenar y fusionar las 4 filas del monitor en vivo
    for (let r = 16; r <= 19; r++) {
      sheet.getRange(`D${r}:G${r}`).merge();
    }

    // Nota / enlace a la pestaña de logs
    sheet.getRange('B20:G20').merge()
      .setValue('📋 Historial completo disponible en pestaña: Logs_MicroOperaciones ➔')
      .setFontFamily('Consolas')
      .setFontSize(8)
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#EFF6FF')
      .setFontColor('#1D4ED8');

    // 4. MATRIZ DE MEMORIA RAM 16x16 (Columnas I a X, Filas 4 a 21)
    sheet.getRange('I4:X4').merge()
      .setValue('MEMORIA PRINCIPAL RAM (256 BYTES: 00h - FFh)')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#FDE047')
      .setHorizontalAlignment('center');

    // Cabeceras de Columna (+0 a +F)
    const colHeaders = ['+0', '+1', '+2', '+3', '+4', '+5', '+6', '+7', '+8', '+9', '+A', '+B', '+C', '+D', '+E', '+F'];
    sheet.getRange('I5:X5').setValues([colHeaders])
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#CBD5E1');

    // Cabeceras de Fila (00_ a F0_)
    const rowHeaders = [];
    for (let i = 0; i < 16; i++) {
      rowHeaders.push([`${i.toString(16).toUpperCase()}0_`]);
    }
    sheet.getRange('H6:H21').setValues(rowHeaders)
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#CBD5E1');

    // Cuadrícula y Bordes de Memoria
    sheet.getRange('I6:X21').setBorder(true, true, true, true, true, true, '#94A3B8', SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange('I6:X21').setNumberFormat('@'); // Forzar texto plano para preservar "00", "01", "06", etc.
    sheet.getRange('C5:G11').setNumberFormat('@'); // Preservar 8 bits con ceros a la izquierda (00000001)
    sheet.getRange('B16:G19').setNumberFormat('@'); // Preservar formato en monitor

    // Leyenda de Segmentación (Filas 23)
    sheet.getRange('I23:M23').merge()
      .setValue('🟦 Segmento Código (00h-7Fh)')
      .setFontFamily('Consolas')
      .setFontSize(8)
      .setHorizontalAlignment('center')
      .setBackground(this.COLORS.CODE_SEG_BG);

    sheet.getRange('N23:R23').merge()
      .setValue('🟩 Segmento Datos (80h-FFh)')
      .setFontFamily('Consolas')
      .setFontSize(8)
      .setHorizontalAlignment('center')
      .setBackground(this.COLORS.DATA_SEG_BG);

    sheet.getRange('S23:X23').merge()
      .setValue('🟨 Celda Activa / Fetch')
      .setFontFamily('Consolas')
      .setFontSize(8)
      .setHorizontalAlignment('center')
      .setBackground(this.COLORS.HIGHLIGHT_FETCH);

    // 5. PANEL DE BOTONES INTERACTIVOS EN LA HOJA (Filas 25 a 30)
    sheet.getRange('B25:X25').merge()
      .setValue('🎮 PANEL DE CONTROL INTERACTIVO (Marca la casilla para accionar)')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#38BDF8')
      .setHorizontalAlignment('center');

    // Controles de Ejecución (Fila 27)
    sheet.getRange('B27').insertCheckboxes();
    sheet.getRange('C27:E27').merge().setValue('⏯️ Paso a Paso (Micro-fase)').setFontFamily('Consolas').setFontWeight('bold').setBackground('#F1F5F9');

    sheet.getRange('F27').insertCheckboxes();
    sheet.getRange('G27:J27').merge().setValue('⏭️ Instrucción Completa').setFontFamily('Consolas').setFontWeight('bold').setBackground('#F1F5F9');

    sheet.getRange('K27').insertCheckboxes();
    sheet.getRange('L27:O27').merge().setValue('▶️ Ejecutar Todo (Run)').setFontFamily('Consolas').setFontWeight('bold').setBackground('#F1F5F9');

    sheet.getRange('P27').insertCheckboxes();
    sheet.getRange('Q27:T27').merge().setValue('🔄 Reset CPU / Registros').setFontFamily('Consolas').setFontWeight('bold').setBackground('#F1F5F9');

    // Controles de Carga de Programas y Navegación (Fila 29)
    sheet.getRange('B29').insertCheckboxes();
    sheet.getRange('C29:E29').merge().setValue('📂 Cargar Fibonacci').setFontFamily('Consolas').setFontWeight('bold').setBackground('#F1F5F9');

    sheet.getRange('F29').insertCheckboxes();
    sheet.getRange('G29:J29').merge().setValue('📂 Cargar Multiplicación').setFontFamily('Consolas').setFontWeight('bold').setBackground('#F1F5F9');

    sheet.getRange('K29').insertCheckboxes();
    sheet.getRange('L29:O29').merge().setValue('🛠️ Resetear Hoja (Setup)').setFontFamily('Consolas').setFontWeight('bold').setBackground('#F1F5F9');

    sheet.getRange('P29').insertCheckboxes();
    sheet.getRange('Q29:T29').merge().setValue('📋 Ver Hoja de Logs').setFontFamily('Consolas').setFontWeight('bold').setBackground('#E0F2FE').setFontColor('#0369A1');

    // Limpiar cualquier fila residual debajo del panel de control
    sheet.getRange('B31:X40').clear();

    // Ajustar anchos de columnas para proporción y legibilidad perfectas
    sheet.setColumnWidth(1, 18);  // Col A (Margen)
    sheet.setColumnWidth(2, 155); // Col B (Registro / Hora)
    sheet.setColumnWidth(3, 105); // Col C (Valor Hex / Fase)
    sheet.setColumnWidth(4, 125); // Col D (Binario 8-Bit)
    sheet.setColumnWidth(5, 125); // Col E (Decimal / Valor)
    sheet.setColumnWidth(6, 95);  // Col F (Estado)
    sheet.setColumnWidth(7, 180); // Col G (Info / Desensamblado)
    sheet.setColumnWidth(8, 48);  // Col H (Fila 00_ a F0_)
    for (let c = 9; c <= 24; c++) {
      sheet.setColumnWidth(c, 44); // Columnas I a X (Matriz 16x16 de Memoria)
    }

    // Aplicar fondos de segmentación iniciales a la matriz 16x16
    this.renderMemoryBackgrounds(sheet, -1, -1);
    this.updateMemoryMatrix(sheet, getMemory());

    SpreadsheetApp.flush();
  }

  /**
   * Aplica los colores de fondo base de la matriz 16x16 respetando la segmentación
   * y colorea selectivamente la celda activa.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number} activeAddr Dirección activa a iluminar (-1 para ninguna)
   * @param {string} highlightColor Color a aplicar a la celda activa
   */
  renderMemoryBackgrounds(sheet, activeAddr = -1, highlightColor = this.COLORS.HIGHLIGHT_FETCH) {
    const backgrounds = [];
    for (let r = 0; r < 16; r++) {
      const rowBg = [];
      for (let c = 0; c < 16; c++) {
        const addr = (r * 16) + c;
        if (addr === activeAddr) {
          rowBg.push(highlightColor);
        } else if (addr <= 0x7F) {
          rowBg.push(this.COLORS.CODE_SEG_BG);
        } else {
          rowBg.push(this.COLORS.DATA_SEG_BG);
        }
      }
      backgrounds.push(rowBg);
    }
    sheet.getRange('I6:X21').setBackgrounds(backgrounds);
  }

  /**
   * Actualiza los valores numéricos de la matriz 16x16 de RAM en lote.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {Memory} memory
   */
  updateMemoryMatrix(sheet, memory) {
    const mem = memory || getMemory();
    const matrixHex = mem.dumpMatrixHex();
    sheet.getRange('I6:X21').setValues(matrixHex)
      .setFontFamily('Consolas')
      .setFontSize(9)
      .setHorizontalAlignment('center');
  }

  /**
   * Sincroniza el dashboard de Registros, Banderas y Estado con el CPU.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {CPU} cpu
   */
  updateRegistersAndState(sheet, cpu) {
    const proc = cpu || getCPU();
    const snap = proc.registers.getSnapshot();
    const cu = proc.controlUnit;

    const values = [
      [`0x${snap.PC.hex}`,  snap.PC.bin,  snap.PC.dec.toString(),  proc.currentPhase, `RAM[0x${snap.PC.hex}]`],
      [`0x${snap.IR.hex}`,  snap.IR.bin,  snap.IR.dec.toString(),  cu.decode(proc.registers.IR).mnemonic, cu.disassemble(proc.registers.IR, proc.operandByte)],
      [`0x${snap.MAR.hex}`, snap.MAR.bin, snap.MAR.dec.toString(), 'ACTIVE', `Dir=0x${snap.MAR.hex}`],
      [`0x${snap.MDR.hex}`, snap.MDR.bin, snap.MDR.dec.toString(), 'ACTIVE', `Dato=0x${snap.MDR.hex}`],
      [`0x${snap.AX.hex}`,  snap.AX.bin,  `${snap.AX.dec} (${snap.AX.signed >= 0 ? '+' : ''}${snap.AX.signed})`, 'ACTIVE', 'Acumulador AX'],
      [`0x${snap.BX.hex}`,  snap.BX.bin,  `${snap.BX.dec} (${snap.BX.signed >= 0 ? '+' : ''}${snap.BX.signed})`, 'ACTIVE', 'Registro BX']
    ];

    sheet.getRange('C6:G11').setValues(values);

    // Actualizar Banderas
    const flagsText = `BANDERAS: ZF = ${snap.FLAGS.ZF}  |  CF = ${snap.FLAGS.CF}  |  SF = ${snap.FLAGS.SF}   [Ciclos: ${proc.cycleCount} | Instrucciones: ${proc.instructionCount}]`;
    sheet.getRange('B12:G12').setValue(flagsText);
  }

  /**
   * Actualiza el Monitor en Vivo de 4 micro-operaciones en la hoja principal.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {Logger} logger
   */
  updateMiniMonitor(sheet, logger) {
    const log = logger || getLogger();
    const entries = log.dumpForMiniMonitor(4);
    
    const times = [];
    const badges = [];
    const details = [];
    const rowBgs = [];
    const badgeColors = [];

    for (let i = 0; i < 4; i++) {
      const item = entries[i];
      const timeVal = item[0];
      const phaseKey = item[1];
      const detailVal = item[2];

      const style = this.PHASE_STYLES[phaseKey] || this.PHASE_STYLES.DEFAULT;
      const badge = (phaseKey === '--') ? '--' : (this.PHASE_STYLES[phaseKey] ? this.PHASE_STYLES[phaseKey].badge : `⚪ ${phaseKey}`);
      const bg = (phaseKey === '--') ? '#FFFFFF' : style.bg;
      const fg = (phaseKey === '--') ? '#94A3B8' : style.text;

      times.push([timeVal]);
      badges.push([badge]);
      details.push([detailVal]);
      rowBgs.push([bg, bg, bg, bg, bg, bg]);
      badgeColors.push([fg]);
    }

    sheet.getRange('B16:B19').setValues(times).setHorizontalAlignment('center');
    sheet.getRange('C16:C19').setValues(badges).setHorizontalAlignment('center').setFontWeight('bold').setFontColors(badgeColors);
    
    for (let i = 0; i < 4; i++) {
      sheet.getRange(`D${16 + i}:G${16 + i}`).setValue(details[i][0]).setHorizontalAlignment('left').setWrap(false);
    }
    
    sheet.getRange('B16:G19').setBackgrounds(rowBgs);
  }

  /**
   * Añade de manera incremental e infinita todas las micro-operaciones pendientes
   * a la pestaña de auditoría sin sobrescribir el historial previo.
   * @param {Logger} logger
   */
  appendDedicatedLogs(logger) {
    try {
      const logsSheet = this.getLogsSheet();
      const log = logger || getLogger();
      const pending = log.consumePendingEntries();
      
      if (!pending || pending.length === 0) return;

      const count = pending.length;
      const lastRow = Math.max(logsSheet.getLastRow(), 4);
      const startRow = lastRow + 1;

      const rows = [];
      const rowBgs = [];
      const badgeColors = [];

      for (let i = 0; i < count; i++) {
        const item = pending[i];
        const phaseKey = item.phase;
        const style = this.PHASE_STYLES[phaseKey] || this.PHASE_STYLES.DEFAULT;
        const badge = (phaseKey === '--') ? '--' : (this.PHASE_STYLES[phaseKey] ? this.PHASE_STYLES[phaseKey].badge : `⚪ ${phaseKey}`);
        const bg = (phaseKey === '--') ? '#FFFFFF' : style.bg;
        const fg = (phaseKey === '--') ? '#94A3B8' : style.text;

        rows.push([
          `#${item.step}`,
          item.timestamp,
          badge,
          item.instruction || '--',
          item.message,
          item.pc || '--',
          item.ir || '--',
          item.mar || '--',
          item.mdr || '--',
          item.ax || '--',
          item.bx || '--',
          item.flags || '--'
        ]);

        const bgs = [];
        for (let c = 0; c < 12; c++) bgs.push(bg);
        rowBgs.push(bgs);
        badgeColors.push([fg]);
      }

      const targetRange = logsSheet.getRange(startRow, 2, count, 12);
      targetRange.setNumberFormat('@');
      targetRange.setValues(rows);
      targetRange.setBackgrounds(rowBgs);
      targetRange.setBorder(true, true, true, true, true, true, '#CBD5E1', SpreadsheetApp.BorderStyle.SOLID);
      logsSheet.getRange(startRow, 4, count, 1).setFontColors(badgeColors).setFontWeight('bold');
    } catch (e) {
      console.log('Aviso: Error agregando logs a hoja dedicada: ' + e);
    }
  }

  /**
   * Sincroniza logs tanto en el monitor de la hoja principal como en la hoja de auditoría infinita.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {Logger} logger
   */
  updateLogs(sheet, logger) {
    this.updateMiniMonitor(sheet, logger);
    this.appendDedicatedLogs(logger);
  }

  /**
   * Renderizado integral de un ciclo de reloj con animación y resaltado.
   * @param {CPU} [cpu]
   * @param {Logger} [logger]
   */
  renderCycle(cpu, logger) {
    const sheet = this.getSheet();
    const proc = cpu || getCPU();
    const log = logger || getLogger();

    let activeAddr = -1;
    let highlightColor = this.COLORS.HIGHLIGHT_FETCH;

    if (proc.activeHighlight && proc.activeHighlight.type === 'MEM_FETCH') {
      activeAddr = proc.activeHighlight.target;
      highlightColor = this.COLORS.HIGHLIGHT_FETCH;
    } else if (proc.activeHighlight && proc.activeHighlight.type === 'MEM_WRITE') {
      activeAddr = proc.activeHighlight.target;
      highlightColor = this.COLORS.HIGHLIGHT_WRITE;
    } else if (proc.registers) {
      activeAddr = proc.registers.PC;
      highlightColor = this.COLORS.HIGHLIGHT_PC;
    }

    this.renderMemoryBackgrounds(sheet, activeAddr, highlightColor);
    this.updateMemoryMatrix(sheet, proc.memory);
    this.updateRegistersAndState(sheet, proc);
    this.updateLogs(sheet, log);

    SpreadsheetApp.flush();
  }
}

// Instancia global y getter diferido para evitar problemas de orden de carga en GAS
var globalUI = null;
function getUI() {
  if (!globalUI) {
    globalUI = new UIRenderer();
  }
  return globalUI;
}
