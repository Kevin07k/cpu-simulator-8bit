/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Memoria Principal (RAM de 8 bits - 256 Bytes)
 * ============================================================================
 * Implementa la memoria física direccionable de 256 posiciones (00h a FFh),
 * operaciones primitivas de lectura/escritura y segmentación lógica.
 */

class Memory {
  constructor() {
    // 256 bytes continuos inicializados a 0x00 (NOP / Vacío)
    this.SIZE = 256;
    this.CODE_SEGMENT_START = 0x00;
    this.CODE_SEGMENT_END = 0x7F; // 128 bytes para código
    this.DATA_SEGMENT_START = 0x80;
    this.DATA_SEGMENT_END = 0xFF; // 128 bytes para datos

    this.bytes = new Uint8Array(this.SIZE);
    this.reset();
  }

  /**
   * Restablece toda la memoria a ceros.
   */
  reset() {
    for (let i = 0; i < this.SIZE; i++) {
      this.bytes[i] = 0x00;
    }
  }

  /**
   * Valida y normaliza una dirección de 8 bits (0x00 - 0xFF).
   * @param {number} address Dirección de memoria
   * @returns {number} Dirección acotada a 8 bits
   */
  normalizeAddress(address) {
    if (typeof address !== 'number' || isNaN(address)) {
      throw new Error(`[Memory Error] Dirección inválida: ${address}`);
    }
    return address & 0xFF;
  }

  /**
   * Operación Primitiva de Lectura: Read(address)
   * Devuelve el byte almacenado en la dirección especificada (8 bits).
   * @param {number} address Dirección en memoria (0x00 - 0xFF)
   * @returns {number} Byte almacenado (0x00 - 0xFF)
   */
  Read(address) {
    const addr = this.normalizeAddress(address);
    return this.bytes[addr] & 0xFF;
  }

  /**
   * Operación Primitiva de Escritura: Write(address, value)
   * Escribe un valor truncado a 8 bits en la dirección especificada.
   * @param {number} address Dirección en memoria (0x00 - 0xFF)
   * @param {number} value Valor de 8 bits a escribir
   */
  Write(address, value) {
    const addr = this.normalizeAddress(address);
    const val = (value || 0) & 0xFF; // Garantiza palabra estricta de 8 bits
    this.bytes[addr] = val;
  }

  /**
   * Determina si una dirección pertenece al Segmento de Código.
   * @param {number} address
   * @returns {boolean}
   */
  isCodeSegment(address) {
    const addr = this.normalizeAddress(address);
    return addr >= this.CODE_SEGMENT_START && addr <= this.CODE_SEGMENT_END;
  }

  /**
   * Determina si una dirección pertenece al Segmento de Datos.
   * @param {number} address
   * @returns {boolean}
   */
  isDataSegment(address) {
    const addr = this.normalizeAddress(address);
    return addr >= this.DATA_SEGMENT_START && addr <= this.DATA_SEGMENT_END;
  }

  /**
   * Carga una secuencia de bytes de programa a partir de una dirección base.
   * @param {Array<number>} programBytes Arreglo de bytes
   * @param {number} startAddress Dirección inicial (por defecto 0x00)
   */
  loadProgram(programBytes, startAddress = 0x00) {
    let addr = this.normalizeAddress(startAddress);
    for (let i = 0; i < programBytes.length; i++) {
      if (addr >= this.SIZE) break;
      this.Write(addr, programBytes[i]);
      addr++;
    }
  }

  /**
   * Obtiene las coordenadas en la matriz 16x16 (fila 0-15, columna 0-15).
   * @param {number} address
   * @returns {{row: number, col: number}}
   */
  getMatrixCoords(address) {
    const addr = this.normalizeAddress(address);
    return {
      row: Math.floor(addr / 16),
      col: addr % 16
    };
  }

  /**
   * Formateador auxiliar a Hexadecimal de 2 dígitos (ej: "0x1A" o "1Ah").
   * @param {number} val
   * @returns {string}
   */
  static toHex8(val) {
    const n = (val || 0) & 0xFF;
    return n.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Formateador auxiliar a Binario de 8 dígitos (ej: "00011010").
   * @param {number} val
   * @returns {string}
   */
  static toBin8(val) {
    const n = (val || 0) & 0xFF;
    return n.toString(2).padStart(8, '0');
  }

  /**
   * Formateador auxiliar a Decimal con signo (Complemento a 2).
   * @param {number} val
   * @returns {number}
   */
  static toSigned8(val) {
    const n = (val || 0) & 0xFF;
    return n > 127 ? n - 256 : n;
  }
}

// Instancia global de memoria para Google Apps Script
var globalMemory = new Memory();
