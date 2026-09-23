/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Unidad Aritmético-Lógica (ALU de 8 bits)
 * ============================================================================
 * Responsable de ejecutar operaciones aritméticas y lógicas sobre operandos
 * de 8 bits, actualizando rigurosamente el registro de estado (FLAGS: ZF, CF, SF).
 */

class ALU {
  /**
   * @param {Registers} registers Referencia al banco de registros
   */
  constructor(registers) {
    this.registers = registers;
  }

  /**
   * Actualiza las banderas ZF y SF en función del resultado de 8 bits.
   * - ZF (Zero Flag): 1 si el byte resultante es exactamente 0x00.
   * - SF (Sign Flag): 1 si el Bit 7 (MSB) es 1 (representación negativa en C2).
   * @param {number} result Resultado de la operación
   */
  updateZeroAndSignFlags(result) {
    const r8 = result & 0xFF;
    this.registers.ZF = (r8 === 0) ? 1 : 0;
    this.registers.SF = ((r8 & 0x80) === 0x80) ? 1 : 0;
  }

  /**
   * Operación Aritmética: ADD (Suma de 8 bits con acarreo sin signo)
   * @param {number} a Operando 1 (8 bits)
   * @param {number} b Operando 2 (8 bits)
   * @returns {number} Resultado truncado a 8 bits
   */
  ADD(a, b) {
    const op1 = a & 0xFF;
    const op2 = b & 0xFF;
    const rawResult = op1 + op2;
    const result8 = rawResult & 0xFF;

    // CF: 1 si existió acarreo saliente del bit 7 (desbordamiento sin signo > 255)
    this.registers.CF = (rawResult > 0xFF) ? 1 : 0;
    this.updateZeroAndSignFlags(result8);

    return result8;
  }

  /**
   * Operación Aritmética: SUB (Resta de 8 bits con detección de préstamo)
   * @param {number} a Minuendo (8 bits)
   * @param {number} b Sustraendo (8 bits)
   * @returns {number} Resultado truncado a 8 bits
   */
  SUB(a, b) {
    const op1 = a & 0xFF;
    const op2 = b & 0xFF;
    const rawResult = op1 - op2;
    const result8 = (rawResult < 0 ? (rawResult + 256) : rawResult) & 0xFF;

    // CF: 1 si existió préstamo (op1 < op2 en aritmética sin signo)
    this.registers.CF = (op1 < op2) ? 1 : 0;
    this.updateZeroAndSignFlags(result8);

    return result8;
  }

  /**
   * Operación Aritmética: INC (Incremento en 1)
   * @param {number} a Operando (8 bits)
   * @returns {number}
   */
  INC(a) {
    const op1 = a & 0xFF;
    const rawResult = op1 + 1;
    const result8 = rawResult & 0xFF;

    // En estándar x86, INC no altera el Carry Flag previo
    this.updateZeroAndSignFlags(result8);
    return result8;
  }

  /**
   * Operación Aritmética: DEC (Decremento en 1)
   * @param {number} a Operando (8 bits)
   * @returns {number}
   */
  DEC(a) {
    const op1 = a & 0xFF;
    const rawResult = op1 - 1;
    const result8 = (rawResult < 0 ? 255 : rawResult) & 0xFF;

    // En estándar x86, DEC no altera el Carry Flag previo
    this.updateZeroAndSignFlags(result8);
    return result8;
  }

  /**
   * Operación de Comparación: CMP (Resta de prueba sin almacenar resultado)
   * Actualiza ZF, CF y SF exactamente igual que SUB(a, b).
   * @param {number} a Operando 1
   * @param {number} b Operando 2
   */
  CMP(a, b) {
    const op1 = a & 0xFF;
    const op2 = b & 0xFF;
    const rawResult = op1 - op2;
    const result8 = (rawResult < 0 ? (rawResult + 256) : rawResult) & 0xFF;

    this.registers.CF = (op1 < op2) ? 1 : 0;
    this.updateZeroAndSignFlags(result8);
  }

  /**
   * Operación Lógica: AND (Conjunción bit a bit)
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  AND(a, b) {
    const result8 = ((a & 0xFF) & (b & 0xFF)) & 0xFF;
    this.registers.CF = 0; // Las operaciones lógicas limpian el Carry
    this.updateZeroAndSignFlags(result8);
    return result8;
  }

  /**
   * Operación Lógica: OR (Disyunción bit a bit)
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  OR(a, b) {
    const result8 = ((a & 0xFF) | (b & 0xFF)) & 0xFF;
    this.registers.CF = 0;
    this.updateZeroAndSignFlags(result8);
    return result8;
  }

  /**
   * Operación Lógica: XOR (Disyunción exclusiva bit a bit)
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  XOR(a, b) {
    const result8 = ((a & 0xFF) ^ (b & 0xFF)) & 0xFF;
    this.registers.CF = 0;
    this.updateZeroAndSignFlags(result8);
    return result8;
  }

  /**
   * Operación Lógica: NOT (Inversión de bits / Complemento a 1)
   * @param {number} a
   * @returns {number}
   */
  NOT(a) {
    const result8 = (~(a & 0xFF)) & 0xFF;
    this.updateZeroAndSignFlags(result8);
    return result8;
  }
}

// Instancia global de ALU vinculada a los registros globales
var globalALU = new ALU(globalRegisters);
