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
    
    // Paleta de Colores de Alto Rendimiento
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
  }

  /**
   * Obtiene o crea la hoja dedicada para la simulación.
   * Soporta tanto hojas vinculadas (container-bound) como scripts independientes (standalone).
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  getSheet() {
    let ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }

    // Fallback si el script es independiente (Standalone)
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
      sheet = ss.insertSheet(this.SHEET_NAME);
    }
    return sheet;
  }

  /**
   * Inicializa la estructura visual completa de la hoja (Setup / Format).
   */
  formatSheet() {
    const sheet = this.getSheet();
    sheet.clear();
    sheet.setGridlines(true);

    // 1. TÍTULO Y BANNER SUPERIOR (Filas 1 y 2)
    sheet.getRange('B1:X1').merge()
      .setValue('SIMULADOR DE CPU VON NEUMANN (8 BITS) — ARQUITECTURA X86')
      .setFontFamily('Consolas')
      .setFontSize(14)
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
      .setValue('DASHBOARD DEL PROCESADOR Y REGISTROS')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#38BDF8')
      .setHorizontalAlignment('center');

    const regHeaders = [
      ['REGISTRO', 'VALOR (HEX)', 'BINARIO (8-BIT)', 'DECIMAL / VALOR', 'ESTADO', 'INFO'],
      ['PC (Program Counter)', '0x00', '00000000', '0', 'IDLE', 'Puntero Inst.'],
      ['IR (Instruction Reg)', '0x00', '00000000', '0', 'NOP', 'Opcode Actual'],
      ['MAR (Memory Address)', '0x00', '00000000', '0', 'READY', 'Bus Direcciones'],
      ['MDR (Memory Data)',    '0x00', '00000000', '0', 'READY', 'Bus de Datos'],
      ['AX (Acumulador)',      '0x00', '00000000', '0', 'READY', 'Registro A'],
      ['BX (Propósito Gral)',  '0x00', '00000000', '0', 'READY', 'Registro B']
    ];
    sheet.getRange('B5:G11').setValues(regHeaders)
      .setFontFamily('Consolas')
      .setFontSize(9);
    sheet.getRange('B5:G5').setFontWeight('bold').setBackground('#E2E8F0');

    // Banderas de Estado (FLAGS)
    sheet.getRange('B12:G12').merge()
      .setValue('BANDERAS DE ESTADO: ZF = 0  |  CF = 0  |  SF = 0')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setBackground('#F8FAFC')
      .setBorder(true, true, true, true, false, false);

    // 3. LOG DE MICRO-OPERACIONES (Columnas B a G, Filas 14 a 28)
    sheet.getRange('B14:G14').merge()
      .setValue('LOG CRONOLÓGICO DE MICRO-OPERACIONES (FETCH / DECODE / EXECUTE / STORE)')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#A7F3D0')
      .setHorizontalAlignment('center');

    sheet.getRange('B15:G15').setValues([['HORA', 'FASE', 'DETALLE DE LA MICRO-OPERACIÓN', '', '', '']])
      .setFontFamily('Consolas')
      .setFontSize(9)
      .setFontWeight('bold')
      .setBackground('#E2E8F0');
    sheet.getRange('D15:G15').merge();

    // Rellenar filas de log vacías iniciales
    for (let r = 16; r <= 28; r++) {
      sheet.getRange(`D${r}:G${r}`).merge();
    }

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

    // Leyenda de Segmentación (Filas 23 y 24)
    sheet.getRange('I23:M23').merge()
      .setValue('🟦 Segmento de Código (00h - 7Fh)')
      .setFontFamily('Consolas')
      .setFontSize(8)
      .setBackground(this.COLORS.CODE_SEG_BG);

    sheet.getRange('N23:R23').merge()
      .setValue('🟩 Segmento de Datos (80h - FFh)')
      .setFontFamily('Consolas')
      .setFontSize(8)
      .setBackground(this.COLORS.DATA_SEG_BG);

    sheet.getRange('S23:X23').merge()
      .setValue('🟨 Celda Activa / Fetch')
      .setFontFamily('Consolas')
      .setFontSize(8)
      .setBackground(this.COLORS.HIGHLIGHT_FETCH);

    // 5. PANEL DE BOTONES INTERACTIVOS EN LA HOJA (Filas 30 a 34)
    sheet.getRange('B30:X30').merge()
      .setValue('🎮 PANEL DE CONTROL INTERACTIVO (Marca la casilla para accionar)')
      .setFontFamily('Consolas')
      .setFontWeight('bold')
      .setBackground('#0F172A')
      .setFontColor('#38BDF8')
      .setHorizontalAlignment('center');

    // Controles de Ejecución (Fila 32)
    sheet.getRange('B32').insertCheckboxes();
    sheet.getRange('C32').setValue('⏯️ Paso a Paso (Micro-fase)').setFontFamily('Consolas').setFontWeight('bold');

    sheet.getRange('F32').insertCheckboxes();
    sheet.getRange('G32').setValue('⏭️ Instrucción Completa').setFontFamily('Consolas').setFontWeight('bold');

    sheet.getRange('K32').insertCheckboxes();
    sheet.getRange('L32:N32').merge().setValue('▶️ Ejecutar Todo (Run)').setFontFamily('Consolas').setFontWeight('bold');

    sheet.getRange('P32').insertCheckboxes();
    sheet.getRange('Q32:S32').merge().setValue('🔄 Reset CPU / Regs').setFontFamily('Consolas').setFontWeight('bold');

    // Controles de Carga de Programas (Fila 34)
    sheet.getRange('B34').insertCheckboxes();
    sheet.getRange('C34:E34').merge().setValue('📂 Cargar Fibonacci').setFontFamily('Consolas').setFontWeight('bold');

    sheet.getRange('F34').insertCheckboxes();
    sheet.getRange('G34:I34').merge().setValue('📂 Cargar Multiplicación').setFontFamily('Consolas').setFontWeight('bold');

    sheet.getRange('K34').insertCheckboxes();
    sheet.getRange('L34:N34').merge().setValue('🛠️ Resetear Hoja (Setup)').setFontFamily('Consolas').setFontWeight('bold');

    // Ajustar anchos de columnas para simetría perfecta
    sheet.setColumnWidth(1, 20);  // Col A (Margen)
    sheet.setColumnWidth(2, 140); // Col B
    sheet.setColumnWidth(3, 85);  // Col C
    sheet.setColumnWidth(4, 90);  // Col D
    sheet.setColumnWidth(5, 90);  // Col E
    sheet.setColumnWidth(6, 85);  // Col F
    sheet.setColumnWidth(7, 100); // Col G
    sheet.setColumnWidth(8, 45);  // Col H (Fila 00_)
    for (let c = 9; c <= 24; c++) {
      sheet.setColumnWidth(c, 40); // Columnas I a X (Matriz 16x16)
    }

    // Aplicar fondos de segmentación iniciales a la matriz 16x16
    this.renderMemoryBackgrounds(sheet, -1, -1);
    this.updateMemoryMatrix(sheet, globalMemory);

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
          rowBg.push(this.COLORS.CODE_SEG_BG); // Segmento de Código
        } else {
          rowBg.push(this.COLORS.DATA_SEG_BG); // Segmento de Datos
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
    const matrixHex = memory.dumpMatrixHex();
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
    const snap = cpu.registers.getSnapshot();
    const cu = cpu.controlUnit;

    const values = [
      [`0x${snap.PC.hex}`,  snap.PC.bin,  snap.PC.dec.toString(),  cpu.currentPhase, `RAM[0x${snap.PC.hex}]`],
      [`0x${snap.IR.hex}`,  snap.IR.bin,  snap.IR.dec.toString(),  cu.decode(cpu.registers.IR).mnemonic, cu.disassemble(cpu.registers.IR, cpu.operandByte)],
      [`0x${snap.MAR.hex}`, snap.MAR.bin, snap.MAR.dec.toString(), 'ACTIVE', `Dir=0x${snap.MAR.hex}`],
      [`0x${snap.MDR.hex}`, snap.MDR.bin, snap.MDR.dec.toString(), 'ACTIVE', `Dato=0x${snap.MDR.hex}`],
      [`0x${snap.AX.hex}`,  snap.AX.bin,  `${snap.AX.dec} (${snap.AX.signed})`, 'ACTIVE', 'Acumulador'],
      [`0x${snap.BX.hex}`,  snap.BX.bin,  `${snap.BX.dec} (${snap.BX.signed})`, 'ACTIVE', 'General']
    ];

    sheet.getRange('C6:G11').setValues(values);

    // Actualizar Banderas
    const flagsText = `BANDERAS: ZF = ${snap.FLAGS.ZF}  |  CF = ${snap.FLAGS.CF}  |  SF = ${snap.FLAGS.SF}   [Ciclos: ${cpu.cycleCount} | Instrucciones: ${cpu.instructionCount}]`;
    sheet.getRange('B12:G12').setValue(flagsText);
  }

  /**
   * Sincroniza las entradas del Logger en la tabla visual de la hoja.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {Logger} logger
   */
  updateLogs(sheet, logger) {
    const entries = logger.dumpForSheet(13);
    const tableData = entries.map(item => [item[0], item[1], item[2]]);
    
    // Asignar en bloque
    for (let i = 0; i < 13; i++) {
      const rowIdx = 16 + i;
      sheet.getRange(`B${rowIdx}`).setValue(tableData[i][0]);
      sheet.getRange(`C${rowIdx}`).setValue(tableData[i][1]);
      sheet.getRange(`D${rowIdx}:G${rowIdx}`).setValue(tableData[i][2]);
    }
  }

  /**
   * Renderizado integral de un ciclo de reloj con animación y resaltado.
   * @param {CPU} cpu
   * @param {Logger} logger
   */
  renderCycle(cpu, logger) {
    const sheet = this.getSheet();

    // 1. Matriz de memoria y celdas activas
    let activeAddr = -1;
    let highlightColor = this.COLORS.HIGHLIGHT_FETCH;

    if (cpu.activeHighlight.type === 'MEM_FETCH') {
      activeAddr = cpu.activeHighlight.target;
      highlightColor = this.COLORS.HIGHLIGHT_FETCH;
    } else if (cpu.activeHighlight.type === 'MEM_WRITE') {
      activeAddr = cpu.activeHighlight.target;
      highlightColor = this.COLORS.HIGHLIGHT_WRITE;
    } else {
      activeAddr = cpu.registers.PC;
      highlightColor = this.COLORS.HIGHLIGHT_PC;
    }

    this.renderMemoryBackgrounds(sheet, activeAddr, highlightColor);
    this.updateMemoryMatrix(sheet, cpu.memory);
    this.updateRegistersAndState(sheet, cpu);
    this.updateLogs(sheet, logger);

    SpreadsheetApp.flush();
  }
}

// Instancia global del renderizador UI
var globalUI = new UIRenderer();
