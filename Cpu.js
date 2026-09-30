/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Núcleo del Procesador y Ciclo de Instrucción (CPU FSM)
 * ============================================================================
 * Implementa la Máquina de Estados Finitos (FSM) que descompone cada instrucción
 * en sus cuatro fases canónicas de reloj: FETCH, DECODE, EXECUTE y STORE.
 */

// Fases del Ciclo de Reloj
const CPU_PHASES = {
  FETCH: 'FETCH',
  DECODE: 'DECODE',
  EXECUTE: 'EXECUTE',
  STORE: 'STORE'
};

class CPU {
  /**
   * @param {Memory} [memory]
   * @param {Registers} [registers]
   * @param {ALU} [alu]
   * @param {ControlUnit} [controlUnit]
   */
  constructor(memory, registers, alu, controlUnit) {
    this.memory = memory || getMemory();
    this.registers = registers || getRegisters();
    this.alu = alu || getALU();
    this.controlUnit = controlUnit || getControlUnit();

    this.reset();
  }

  /**
   * Restaura el CPU a su estado inicial.
   */
  reset() {
    this.currentPhase = CPU_PHASES.FETCH;
    this.isHalted = false;
    this.cycleCount = 0;
    this.instructionCount = 0;

    // Variables internas de pipeline/micro-operación
    this.currentInstruction = null;
    this.operandByte = null;
    this.executionResult = null;
    this.storeTarget = null; // { type: 'REG' | 'MEM' | 'BRANCH', dest: 'AX' | 'BX' | number, value: number }
    this.lastMicroOpLog = 'CPU Inicializado. Listo para ejecutar.';
    this.activeHighlight = { type: 'NONE', target: null };
  }

  /**
   * Ejecuta una sola micro-fase del ciclo de reloj (Step-by-Step granular).
   * @returns {Object} Estado de la micro-operación efectuada
   */
  stepPhase() {
    if (this.isHalted) {
      this.lastMicroOpLog = `[HALT] El procesador está detenido. Ejecute RESET para reiniciar.`;
      return this.getState();
    }

    switch (this.currentPhase) {
      case CPU_PHASES.FETCH:
        this._phaseFetch();
        this.currentPhase = CPU_PHASES.DECODE;
        break;

      case CPU_PHASES.DECODE:
        this._phaseDecode();
        this.currentPhase = CPU_PHASES.EXECUTE;
        break;

      case CPU_PHASES.EXECUTE:
        this._phaseExecute();
        if (this.isHalted) {
          this.currentPhase = CPU_PHASES.FETCH;
        } else {
          this.currentPhase = CPU_PHASES.STORE;
        }
        break;

      case CPU_PHASES.STORE:
        this._phaseStore();
        this.instructionCount++;
        this.currentPhase = CPU_PHASES.FETCH;
        break;
    }

    this.cycleCount++;
    return this.getState();
  }

  /**
   * Ejecuta las 4 fases completas de una sola instrucción de principio a fin.
   * @returns {Object}
   */
  stepInstruction() {
    if (this.isHalted) return this.getState();

    const startCount = this.instructionCount;
    let safetyGuard = 0;
    while (this.instructionCount === startCount && !this.isHalted && safetyGuard < 10) {
      this.stepPhase();
      safetyGuard++;
    }
    return this.getState();
  }

  /**
   * 1. FASE FETCH: Búsqueda del Opcode en Memoria
   * - MAR <- PC
   * - MDR <- RAM[MAR]
   * - IR  <- MDR
   * - PC  <- PC + 1
   * @private
   */
  _phaseFetch() {
    this.storeTarget = null;
    this.registers.MAR = this.registers.PC;
    const fetchAddress = this.registers.MAR;

    this.registers.MDR = this.memory.Read(this.registers.MAR);
    this.registers.IR = this.registers.MDR;
    this.registers.incrementPC();

    this.activeHighlight = { type: 'MEM_FETCH', target: fetchAddress };
    this.lastMicroOpLog = `[Paso ${this.cycleCount + 1}] FETCH: MAR=0x${Memory.toHex8(fetchAddress)} ➔ MDR=0x${Memory.toHex8(this.registers.MDR)} ➔ IR=0x${Memory.toHex8(this.registers.IR)}, PC=0x${Memory.toHex8(this.registers.PC)}`;
  }

  /**
   * 2. FASE DECODE: Decodificación e Interpretación de Operandos
   * @private
   */
  _phaseDecode() {
    this.currentInstruction = this.controlUnit.decode(this.registers.IR);
    this.operandByte = null;
    this.storeTarget = null;
    this.executionResult = null;

    // Si la instrucción requiere un segundo byte de operando/dirección
    if (this.currentInstruction.bytes === 2) {
      this.registers.MAR = this.registers.PC;
      this.registers.MDR = this.memory.Read(this.registers.MAR);
      this.operandByte = this.registers.MDR;
      this.registers.incrementPC();
    }

    const humanReadable = this.controlUnit.disassemble(this.registers.IR, this.operandByte);
    this.activeHighlight = { type: 'REG', target: 'IR' };
    this.lastMicroOpLog = `[Paso ${this.cycleCount + 1}] DECODE: IR=0x${Memory.toHex8(this.registers.IR)} [${humanReadable}] (Modo: ${this.currentInstruction.mode})`;
  }

  /**
   * 3. FASE EXECUTE: Procesamiento en ALU o Evaluación de Bifurcaciones
   * @private
   */
  _phaseExecute() {
    const instr = this.currentInstruction;
    const op = instr.opcode;
    const immOrDir = this.operandByte;

    let actionDetail = '';

    switch (op) {
      // --- NOP & HLT ---
      case 0x00: // NOP
        actionDetail = 'NOP: Ninguna operación efectuada';
        break;
      case 0xFF: // HLT
        this.isHalted = true;
        actionDetail = 'HLT: Reloj del procesador detenido (Halt)';
        this.activeHighlight = { type: 'HALT', target: null };
        break;

      // --- MOV ---
      case 0x01: // MOV AX, imm
        this.storeTarget = { type: 'REG', dest: 'AX', value: immOrDir };
        actionDetail = `MOV: Preparar AX <- 0x${Memory.toHex8(immOrDir)}`;
        break;
      case 0x02: // MOV BX, imm
        this.storeTarget = { type: 'REG', dest: 'BX', value: immOrDir };
        actionDetail = `MOV: Preparar BX <- 0x${Memory.toHex8(immOrDir)}`;
        break;
      case 0x03: // MOV AX, BX
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.registers.BX };
        actionDetail = `MOV: Preparar AX <- BX (0x${Memory.toHex8(this.registers.BX)})`;
        break;
      case 0x04: // MOV BX, AX
        this.storeTarget = { type: 'REG', dest: 'BX', value: this.registers.AX };
        actionDetail = `MOV: Preparar BX <- AX (0x${Memory.toHex8(this.registers.AX)})`;
        break;

      // --- LOAD & STORE ---
      case 0x05: // LOAD AX, [dir]
        this.registers.MAR = immOrDir;
        this.registers.MDR = this.memory.Read(this.registers.MAR);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.registers.MDR };
        actionDetail = `LOAD: RAM[0x${Memory.toHex8(immOrDir)}] (0x${Memory.toHex8(this.registers.MDR)}) -> AX`;
        break;
      case 0x06: // LOAD BX, [dir]
        this.registers.MAR = immOrDir;
        this.registers.MDR = this.memory.Read(this.registers.MAR);
        this.storeTarget = { type: 'REG', dest: 'BX', value: this.registers.MDR };
        actionDetail = `LOAD: RAM[0x${Memory.toHex8(immOrDir)}] (0x${Memory.toHex8(this.registers.MDR)}) -> BX`;
        break;
      case 0x07: // STORE [dir], AX
        this.storeTarget = { type: 'MEM', dest: immOrDir, value: this.registers.AX };
        actionDetail = `STORE: AX (0x${Memory.toHex8(this.registers.AX)}) -> RAM[0x${Memory.toHex8(immOrDir)}]`;
        break;
      case 0x08: // STORE [dir], BX
        this.storeTarget = { type: 'MEM', dest: immOrDir, value: this.registers.BX };
        actionDetail = `STORE: BX (0x${Memory.toHex8(this.registers.BX)}) -> RAM[0x${Memory.toHex8(immOrDir)}]`;
        break;

      // --- ARITMÉTICA ---
      case 0x10: // ADD AX, imm
        this.executionResult = this.alu.ADD(this.registers.AX, immOrDir);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU ADD: AX(0x${Memory.toHex8(this.registers.AX)}) + 0x${Memory.toHex8(immOrDir)} = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x11: // ADD AX, BX
        this.executionResult = this.alu.ADD(this.registers.AX, this.registers.BX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU ADD: AX(0x${Memory.toHex8(this.registers.AX)}) + BX(0x${Memory.toHex8(this.registers.BX)}) = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x12: // SUB AX, imm
        this.executionResult = this.alu.SUB(this.registers.AX, immOrDir);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU SUB: AX(0x${Memory.toHex8(this.registers.AX)}) - 0x${Memory.toHex8(immOrDir)} = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x13: // SUB AX, BX
        this.executionResult = this.alu.SUB(this.registers.AX, this.registers.BX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU SUB: AX(0x${Memory.toHex8(this.registers.AX)}) - BX(0x${Memory.toHex8(this.registers.BX)}) = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x14: // INC AX
        this.executionResult = this.alu.INC(this.registers.AX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU INC: AX <- 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x15: // INC BX
        this.executionResult = this.alu.INC(this.registers.BX);
        this.storeTarget = { type: 'REG', dest: 'BX', value: this.executionResult };
        actionDetail = `ALU INC: BX <- 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x16: // DEC AX
        this.executionResult = this.alu.DEC(this.registers.AX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU DEC: AX <- 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x17: // DEC BX
        this.executionResult = this.alu.DEC(this.registers.BX);
        this.storeTarget = { type: 'REG', dest: 'BX', value: this.executionResult };
        actionDetail = `ALU DEC: BX <- 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x18: // CMP AX, imm
        this.alu.CMP(this.registers.AX, immOrDir);
        actionDetail = `ALU CMP: Comparar AX(0x${Memory.toHex8(this.registers.AX)}) con 0x${Memory.toHex8(immOrDir)}`;
        break;
      case 0x19: // CMP AX, BX
        this.alu.CMP(this.registers.AX, this.registers.BX);
        actionDetail = `ALU CMP: Comparar AX(0x${Memory.toHex8(this.registers.AX)}) con BX(0x${Memory.toHex8(this.registers.BX)})`;
        break;

      // --- LÓGICA ---
      case 0x20: // AND AX, imm
        this.executionResult = this.alu.AND(this.registers.AX, immOrDir);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU AND: AX & 0x${Memory.toHex8(immOrDir)} = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x21: // AND AX, BX
        this.executionResult = this.alu.AND(this.registers.AX, this.registers.BX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU AND: AX & BX = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x22: // OR AX, imm
        this.executionResult = this.alu.OR(this.registers.AX, immOrDir);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU OR: AX | 0x${Memory.toHex8(immOrDir)} = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x23: // OR AX, BX
        this.executionResult = this.alu.OR(this.registers.AX, this.registers.BX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU OR: AX | BX = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x24: // XOR AX, imm
        this.executionResult = this.alu.XOR(this.registers.AX, immOrDir);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU XOR: AX ^ 0x${Memory.toHex8(immOrDir)} = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x25: // XOR AX, BX
        this.executionResult = this.alu.XOR(this.registers.AX, this.registers.BX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU XOR: AX ^ BX = 0x${Memory.toHex8(this.executionResult)}`;
        break;
      case 0x26: // NOT AX
        this.executionResult = this.alu.NOT(this.registers.AX);
        this.storeTarget = { type: 'REG', dest: 'AX', value: this.executionResult };
        actionDetail = `ALU NOT: ~AX = 0x${Memory.toHex8(this.executionResult)}`;
        break;

      // --- BIFURCACIONES ---
      case 0x30: // JMP dir
        this.registers.PC = immOrDir;
        actionDetail = `JMP: Salto incondicional a 0x${Memory.toHex8(immOrDir)}`;
        break;
      case 0x31: // JZ dir
        if (this.registers.ZF === 1) {
          this.registers.PC = immOrDir;
          actionDetail = `JZ: Salto ejecutado (ZF=1) ➔ PC=0x${Memory.toHex8(immOrDir)}`;
        } else {
          actionDetail = `JZ: Salto ignorado (ZF=0) ➔ Continúa a PC=0x${Memory.toHex8(this.registers.PC)}`;
        }
        break;
      case 0x32: // JNZ dir
        if (this.registers.ZF === 0) {
          this.registers.PC = immOrDir;
          actionDetail = `JNZ: Salto ejecutado (ZF=0) ➔ PC=0x${Memory.toHex8(immOrDir)}`;
        } else {
          actionDetail = `JNZ: Salto ignorado (ZF=1) ➔ Continúa a PC=0x${Memory.toHex8(this.registers.PC)}`;
        }
        break;

      default:
        actionDetail = `Opcode no reconocido (0x${Memory.toHex8(op)})`;
    }

    this.activeHighlight = { type: 'ALU', target: op };
    this.lastMicroOpLog = `[Paso ${this.cycleCount + 1}] EXECUTE: ${actionDetail} | ${this.registers.getSnapshot().FLAGS.summary}`;
  }

  /**
   * 4. FASE STORE: Escritura y Almacenamiento Final (Write-back)
   * @private
   */
  _phaseStore() {
    if (!this.storeTarget) {
      this.lastMicroOpLog = `[Paso ${this.cycleCount + 1}] STORE: Operación finalizada sin almacenamiento en destino`;
      this.activeHighlight = { type: 'NONE', target: null };
      return;
    }

    if (this.storeTarget.type === 'REG') {
      if (this.storeTarget.dest === 'AX') {
        this.registers.AX = this.storeTarget.value;
        this.activeHighlight = { type: 'REG', target: 'AX' };
      } else if (this.storeTarget.dest === 'BX') {
        this.registers.BX = this.storeTarget.value;
        this.activeHighlight = { type: 'REG', target: 'BX' };
      }
      this.lastMicroOpLog = `[Paso ${this.cycleCount + 1}] STORE: Registro ${this.storeTarget.dest} 🠄 0x${Memory.toHex8(this.storeTarget.value)}`;
    } else if (this.storeTarget.type === 'MEM') {
      const targetAddr = this.storeTarget.dest;
      if (typeof targetAddr === 'number' && targetAddr >= 0 && targetAddr < 256) {
        this.registers.MAR = targetAddr;
        this.registers.MDR = this.storeTarget.value;
        this.memory.Write(this.registers.MAR, this.registers.MDR);
        this.activeHighlight = { type: 'MEM_WRITE', target: targetAddr };
        this.lastMicroOpLog = `[Paso ${this.cycleCount + 1}] STORE: MDR(0x${Memory.toHex8(this.registers.MDR)}) ➔ RAM[0x${Memory.toHex8(targetAddr)}]`;
      }
    }
    this.storeTarget = null; // Limpiar para que no persista en ciclos posteriores
  }

  /**
   * Devuelve el estado integral del procesador.
   * @returns {Object}
   */
  getState() {
    return {
      phase: this.currentPhase,
      isHalted: this.isHalted,
      cycleCount: this.cycleCount,
      instructionCount: this.instructionCount,
      registers: this.registers.getSnapshot(),
      lastLog: this.lastMicroOpLog,
      highlight: this.activeHighlight
    };
  }
}

// Instancia global y getter diferido para evitar problemas de orden de carga en GAS
var globalCPU = null;
function getCPU() {
  if (!globalCPU) {
    globalCPU = new CPU(getMemory(), getRegisters(), getALU(), getControlUnit());
  }
  return globalCPU;
}
