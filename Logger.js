/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Sistema de Registro de Micro-operaciones (Logger)
 * ============================================================================
 * Gestiona el historial cronológico de micro-operaciones y traza de ejecución
 * de cada fase de reloj para su renderizado en la hoja de cálculo.
 */

class Logger {
  constructor() {
    this.logs = []; // Últimas entradas para el monitor en vivo (máx 6)
    this.pendingEntries = []; // Cola de entradas nuevas a volcar en la hoja infinita
  }

  /**
   * Limpia el registro de eventos.
   */
  clear() {
    this.logs = [];
    this.pendingEntries = [];
  }

  /**
   * Serializa las entradas del log para persistencia en PropertiesService.
   * Guarda únicamente las últimas 6 entradas para no exceder la cuota de 9KB.
   * @returns {Array<Object>}
   */
  serialize() {
    return this.logs;
  }

  /**
   * Restaura las entradas del log desde PropertiesService.
   * @param {Array<Object>} data
   */
  deserialize(data) {
    if (Array.isArray(data)) {
      this.logs = data.slice(0, 6);
    }
  }

  /**
   * Añade una nueva entrada al registro cronológico con métricas detalladas.
   * @param {string} message Mensaje descriptivo de la micro-operación
   * @param {string} phase Fase del ciclo (FETCH, DECODE, EXECUTE, STORE)
   * @param {Object} [extra] Snapshot opcional de registros, flags y desensamblado
   */
  log(message, phase = 'INFO', extra = null) {
    const timestamp = new Date().toLocaleTimeString('es-BO', { hour12: false });
    const entry = {
      timestamp: timestamp,
      phase: phase,
      message: message,
      step: extra && extra.step !== undefined ? extra.step : (this.logs.length + 1),
      instruction: extra && extra.instruction ? extra.instruction : '',
      pc: extra && extra.pc ? extra.pc : '',
      ir: extra && extra.ir ? extra.ir : '',
      mar: extra && extra.mar ? extra.mar : '',
      mdr: extra && extra.mdr ? extra.mdr : '',
      ax: extra && extra.ax ? extra.ax : '',
      bx: extra && extra.bx ? extra.bx : '',
      flags: extra && extra.flags ? extra.flags : ''
    };

    // 1. Guardar para el monitor en vivo (más reciente primero, máx 6 para PropertiesService)
    this.logs.unshift(entry);
    if (this.logs.length > 6) {
      this.logs.pop();
    }

    // 2. Acumular en la cola de volcado para la hoja de cálculo infinita
    this.pendingEntries.push(entry);
  }

  /**
   * Obtiene y vacía la cola de entradas pendientes de volcar a la hoja.
   * @returns {Array<Object>}
   */
  consumePendingEntries() {
    const entries = this.pendingEntries;
    this.pendingEntries = [];
    return entries;
  }

  /**
   * Exporta las últimas 4 micro-operaciones para el monitor en vivo del simulador principal.
   * @param {number} totalRows
   * @returns {Array<Array<string>>}
   */
  dumpForMiniMonitor(totalRows = 4) {
    const rows = [];
    for (let i = 0; i < totalRows; i++) {
      if (i < this.logs.length) {
        const item = this.logs[i];
        rows.push([item.timestamp, item.phase, item.message, item.instruction || '']);
      } else {
        rows.push(['--', '--', '', '']);
      }
    }
    return rows;
  }

  /**
   * Compatibilidad hacia atrás: volcado para tabla estándar.
   * @param {number} totalRows
   * @returns {Array<Array<string>>}
   */
  dumpForSheet(totalRows = 13) {
    const rows = [];
    for (let i = 0; i < totalRows; i++) {
      if (i < this.logs.length) {
        const item = this.logs[i];
        rows.push([item.timestamp, item.phase, item.message]);
      } else {
        rows.push(['--', '--', '']);
      }
    }
    return rows;
  }
}

// Instancia global y getter diferido para evitar problemas de orden de carga en GAS
var globalLogger = null;
function getLogger() {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}
