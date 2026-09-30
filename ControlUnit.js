/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Unidad de Control y Decodificador de Instrucciones (ISA x86 - 8 bits)
 * ============================================================================
 * Define el conjunto de instrucciones (ISA), interpreta los Opcodes,
 * clasifica los modos de direccionamiento y genera desensamblado legible.
 */

// Modos de Direccionamiento Soportados
const ADDRESSING_MODES = {
  IMPLIED: 'IMPLIED',     // Sin operandos o registro implícito (ej: HLT, INC AX)
  REGISTER: 'REGISTER',   // Entre registros (ej: MOV AX, BX)
  IMMEDIATE: 'IMMEDIATE', // Con constante de 8 bits (ej: MOV AX, 5)
  DIRECT: 'DIRECT'        // Dirección directa de memoria (ej: LOAD AX, [0x80], JMP 0x10)
};

// Categorías de Instrucción
const INSTRUCTION_TYPES = {
  DATA_TRANSFER: 'DATA_TRANSFER',
  ARITHMETIC: 'ARITHMETIC',
  LOGIC: 'LOGIC',
  BRANCH: 'BRANCH',
  CONTROL: 'CONTROL'
};

class ControlUnit {
  constructor() {
    this.ISA = this._initISA();
  }

  /**
   * Inicializa la tabla formal del repertorio de instrucciones (ISA).
   * @private
   */
  _initISA() {
    return {
      // --- Transferencia de Datos ---
      0x01: { opcode: 0x01, mnemonic: 'MOV', operands: 'AX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'AX <- imm' },
      0x02: { opcode: 0x02, mnemonic: 'MOV', operands: 'BX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'BX <- imm' },
      0x03: { opcode: 0x03, mnemonic: 'MOV', operands: 'AX, BX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'AX <- BX' },
      0x04: { opcode: 0x04, mnemonic: 'MOV', operands: 'BX, AX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'BX <- AX' },
      0x05: { opcode: 0x05, mnemonic: 'LOAD', operands: 'AX, [dir]', bytes: 2, mode: ADDRESSING_MODES.DIRECT, type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'AX <- RAM[dir]' },
      0x06: { opcode: 0x06, mnemonic: 'LOAD', operands: 'BX, [dir]', bytes: 2, mode: ADDRESSING_MODES.DIRECT, type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'BX <- RAM[dir]' },
      0x07: { opcode: 0x07, mnemonic: 'STORE', operands: '[dir], AX', bytes: 2, mode: ADDRESSING_MODES.DIRECT, type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'RAM[dir] <- AX' },
      0x08: { opcode: 0x08, mnemonic: 'STORE', operands: '[dir], BX', bytes: 2, mode: ADDRESSING_MODES.DIRECT, type: INSTRUCTION_TYPES.DATA_TRANSFER, desc: 'RAM[dir] <- BX' },

      // --- Aritmética y Lógica ---
      0x10: { opcode: 0x10, mnemonic: 'ADD', operands: 'AX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'AX <- AX + imm' },
      0x11: { opcode: 0x11, mnemonic: 'ADD', operands: 'AX, BX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'AX <- AX + BX' },
      0x12: { opcode: 0x12, mnemonic: 'SUB', operands: 'AX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'AX <- AX - imm' },
      0x13: { opcode: 0x13, mnemonic: 'SUB', operands: 'AX, BX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'AX <- AX - BX' },
      0x14: { opcode: 0x14, mnemonic: 'INC', operands: 'AX',      bytes: 1, mode: ADDRESSING_MODES.IMPLIED,   type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'AX <- AX + 1' },
      0x15: { opcode: 0x15, mnemonic: 'INC', operands: 'BX',      bytes: 1, mode: ADDRESSING_MODES.IMPLIED,   type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'BX <- BX + 1' },
      0x16: { opcode: 0x16, mnemonic: 'DEC', operands: 'AX',      bytes: 1, mode: ADDRESSING_MODES.IMPLIED,   type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'AX <- AX - 1' },
      0x17: { opcode: 0x17, mnemonic: 'DEC', operands: 'BX',      bytes: 1, mode: ADDRESSING_MODES.IMPLIED,   type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'BX <- BX - 1' },
      0x18: { opcode: 0x18, mnemonic: 'CMP', operands: 'AX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'Test AX - imm' },
      0x19: { opcode: 0x19, mnemonic: 'CMP', operands: 'AX, BX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.ARITHMETIC, desc: 'Test AX - BX' },

      0x20: { opcode: 0x20, mnemonic: 'AND', operands: 'AX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.LOGIC, desc: 'AX <- AX & imm' },
      0x21: { opcode: 0x21, mnemonic: 'AND', operands: 'AX, BX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.LOGIC, desc: 'AX <- AX & BX' },
      0x22: { opcode: 0x22, mnemonic: 'OR',  operands: 'AX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.LOGIC, desc: 'AX <- AX | imm' },
      0x23: { opcode: 0x23, mnemonic: 'OR',  operands: 'AX, BX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.LOGIC, desc: 'AX <- AX | BX' },
      0x24: { opcode: 0x24, mnemonic: 'XOR', operands: 'AX, imm', bytes: 2, mode: ADDRESSING_MODES.IMMEDIATE, type: INSTRUCTION_TYPES.LOGIC, desc: 'AX <- AX ^ imm' },
      0x25: { opcode: 0x25, mnemonic: 'XOR', operands: 'AX, BX',  bytes: 1, mode: ADDRESSING_MODES.REGISTER,  type: INSTRUCTION_TYPES.LOGIC, desc: 'AX <- AX ^ BX' },
      0x26: { opcode: 0x26, mnemonic: 'NOT', operands: 'AX',      bytes: 1, mode: ADDRESSING_MODES.IMPLIED,   type: INSTRUCTION_TYPES.LOGIC, desc: 'AX <- ~AX' },

      // --- Control de Flujo y Saltos ---
      0x30: { opcode: 0x30, mnemonic: 'JMP', operands: 'dir',     bytes: 2, mode: ADDRESSING_MODES.DIRECT,    type: INSTRUCTION_TYPES.BRANCH, desc: 'PC <- dir' },
      0x31: { opcode: 0x31, mnemonic: 'JZ',  operands: 'dir',     bytes: 2, mode: ADDRESSING_MODES.DIRECT,    type: INSTRUCTION_TYPES.BRANCH, desc: 'If ZF=1 then PC <- dir' },
      0x32: { opcode: 0x32, mnemonic: 'JNZ', operands: 'dir',     bytes: 2, mode: ADDRESSING_MODES.DIRECT,    type: INSTRUCTION_TYPES.BRANCH, desc: 'If ZF=0 then PC <- dir' },

      // --- Control del Sistema ---
      0x00: { opcode: 0x00, mnemonic: 'NOP', operands: '',        bytes: 1, mode: ADDRESSING_MODES.IMPLIED,   type: INSTRUCTION_TYPES.CONTROL, desc: 'No Operation' },
      0xFF: { opcode: 0xFF, mnemonic: 'HLT', operands: '',        bytes: 1, mode: ADDRESSING_MODES.IMPLIED,   type: INSTRUCTION_TYPES.CONTROL, desc: 'Halt Execution' }
    };
  }

  /**
   * Decodifica un byte de Opcode buscando su definición en la ISA.
   * @param {number} opcode Byte de código de operación (0x00 - 0xFF)
   * @returns {Object} Definición de la instrucción
   */
  decode(opcode) {
    const op = (opcode || 0) & 0xFF;
    if (this.ISA[op]) {
      return this.ISA[op];
    }
    // Opcode desconocido (tratado como NOP seguro)
    return {
      opcode: op,
      mnemonic: `UNKNOWN (0x${Memory.toHex8(op)})`,
      operands: '',
      bytes: 1,
      mode: ADDRESSING_MODES.IMPLIED,
      type: INSTRUCTION_TYPES.CONTROL,
      desc: 'Unknown Opcode'
    };
  }

  /**
   * Genera el texto mnemónico desensamblado legible (ej: "MOV AX, 0x05").
   * @param {number} opcode Byte de opcode
   * @param {number|null} operandByte Byte de operando (si aplica)
   * @returns {string} Cadena en lenguaje ensamblador
   */
  disassemble(opcode, operandByte = null) {
    const instr = this.decode(opcode);
    if (instr.bytes === 1) {
      return instr.operands ? `${instr.mnemonic} ${instr.operands}` : instr.mnemonic;
    }

    // Instrucciones de 2 bytes (reemplazar imm / dir con el valor hexadecimal)
    const valHex = `0x${Memory.toHex8(operandByte !== null ? operandByte : 0x00)}`;
    if (instr.operands.includes('imm')) {
      return `${instr.mnemonic} ${instr.operands.replace('imm', valHex)}`;
    }
    if (instr.operands.includes('[dir]')) {
      return `${instr.mnemonic} ${instr.operands.replace('dir', valHex)}`;
    }
    if (instr.operands.includes('dir')) {
      return `${instr.mnemonic} ${valHex}`;
    }
    return `${instr.mnemonic} ${valHex}`;
  }
}

// Instancia global y getter diferido para evitar problemas de orden de carga en GAS
var globalControlUnit = null;
function getControlUnit() {
  if (!globalControlUnit) {
    globalControlUnit = new ControlUnit();
  }
  return globalControlUnit;
}
