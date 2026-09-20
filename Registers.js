/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Banco de Registros y Registro de Estado (FLAGS)
 * ============================================================================
 * Implementa el almacenamiento interno del procesador:
 * - Registros de Control y Bus: PC, IR, MAR, MDR
 * - Registros de Propósito General: AX (Acumulador), BX
 * - Registro de Estado: ZF (Zero), CF (Carry), SF (Sign)
 */

class Registers {
  constructor() {
    this.reset();
  }

  /**
   * Restablece todos los registros y banderas a su estado inicial (0x00).
   */
  reset() {
    // Registros de control y bus (8 bits cada uno)
    this._pc = 0x00;  // Program Counter
    this._ir = 0x00;  // Instruction Register
    this._mar = 0x00; // Memory Address Register
    this._mdr = 0x00; // Memory Data Register / MBR

    // Registros de propósito general (8 bits cada uno)
    this._ax = 0x00;  // Acumulador
    this._bx = 0x00;  // Registro Auxiliar B

    // Banderas de estado (Flags de 1 bit)
    this._zf = 0;     // Zero Flag (1 = resultado cero)
    this._cf = 0;     // Carry Flag (1 = acarreo sin signo / overflow)
    this._sf = 0;     // Sign Flag (1 = bit 7 en alto / negativo en C2)
  }

  // --- Getters y Setters con validación estricta de 8 bits ---

  get PC() { return this._pc; }
  set PC(val) { this._pc = (val || 0) & 0xFF; }

  get IR() { return this._ir; }
  set IR(val) { this._ir = (val || 0) & 0xFF; }

  get MAR() { return this._mar; }
  set MAR(val) { this._mar = (val || 0) & 0xFF; }

  get MDR() { return this._mdr; }
  set MDR(val) { this._mdr = (val || 0) & 0xFF; }

  get AX() { return this._ax; }
  set AX(val) { this._ax = (val || 0) & 0xFF; }

  get BX() { return this._bx; }
  set BX(val) { this._bx = (val || 0) & 0xFF; }

  // --- Banderas de Estado (1 bit: 0 o 1) ---

  get ZF() { return this._zf; }
  set ZF(val) { this._zf = val ? 1 : 0; }

  get CF() { return this._cf; }
  set CF(val) { this._cf = val ? 1 : 0; }

  get SF() { return this._sf; }
  set SF(val) { this._sf = val ? 1 : 0; }

  /**
   * Incrementa el Program Counter en 1 con wrap-around a 8 bits.
   * @returns {number} Nuevo valor del PC
   */
  incrementPC() {
    this.PC = (this._pc + 1) & 0xFF;
    return this.PC;
  }

  /**
   * Genera una captura (snapshot) estructurada del estado de todos los registros
   * para visualización en la interfaz y panel de micro-operaciones.
   * @returns {Object}
   */
  getSnapshot() {
    return {
      PC: { dec: this._pc, hex: Memory.toHex8(this._pc), bin: Memory.toBin8(this._pc) },
      IR: { dec: this._ir, hex: Memory.toHex8(this._ir), bin: Memory.toBin8(this._ir) },
      MAR: { dec: this._mar, hex: Memory.toHex8(this._mar), bin: Memory.toBin8(this._mar) },
      MDR: { dec: this._mdr, hex: Memory.toHex8(this._mdr), bin: Memory.toBin8(this._mdr) },
      AX: { dec: this._ax, hex: Memory.toHex8(this._ax), bin: Memory.toBin8(this._ax), signed: Memory.toSigned8(this._ax) },
      BX: { dec: this._bx, hex: Memory.toHex8(this._bx), bin: Memory.toBin8(this._bx), signed: Memory.toSigned8(this._bx) },
      FLAGS: {
        ZF: this._zf,
        CF: this._cf,
        SF: this._sf,
        summary: `ZF=${this._zf} | CF=${this._cf} | SF=${this._sf}`
      }
    };
  }
}

// Instancia global de registros para el motor
var globalRegisters = new Registers();
