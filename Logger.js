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
  constructor(maxEntries = 25) {
    this.maxEntries = maxEntries;
    this.logs = [];
  }

  /**
   * Limpia el registro de eventos.
   */
  clear() {
    this.logs = [];
  }

  /**
   * Añade una nueva entrada al registro cronológico.
   * @param {string} message Mensaje descriptivo de la micro-operación
   * @param {string} phase Fase del ciclo (FETCH, DECODE, EXECUTE, STORE)
   */
  log(message, phase = 'INFO') {
    const timestamp = new Date().toLocaleTimeString('es-BO', { hour12: false });
    const entry = {
      timestamp: timestamp,
      phase: phase,
      message: message
    };

    this.logs.unshift(entry); // Inserta al inicio (más reciente arriba)
    if (this.logs.length > this.maxEntries) {
      this.logs.pop();
    }
  }

  /**
   * Exporta las entradas del log en formato de matriz 2D para volcado en Sheets.
   * @param {number} totalRows Cantidad de filas a rellenar en la tabla de la hoja
   * @returns {Array<Array<string>>}
   */
  dumpForSheet(totalRows = 15) {
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
    globalLogger = new Logger(25);
  }
  return globalLogger;
}
