/**
 * ============================================================================
 * UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"
 * Arquitectura de Computadoras (SIS-131) - Semestre 1/2026
 * Módulo: Programas Demostrativos Ensamblados (Programs Library)
 * ============================================================================
 * Contiene el código máquina (bytecode) de programas obligatorios con bucles,
 * saltos condicionales y almacenamiento en el Segmento de Datos (80h - FFh).
 */

class DemoPrograms {
  /**
   * Programa 1: Multiplicación Aritmética por Sumas Sucesivas (6 * 7 = 42)
   * 
   * Segmento de Datos (Variables):
   * - 0x80: Multiplicando = 0x06 (6d)
   * - 0x81: Multiplicador = 0x07 (7d) -> Contador decreciente
   * - 0x82: Producto Acumulado = 0x2A (42d)
   * 
   * Traza de Ejecución:
   * 1. Inicializa RAM[0x80]=6, RAM[0x81]=7, RAM[0x82]=0
   * 2. Bucle: Comprueba si Contador (0x81) == 0 mediante CMP
   * 3. Si ZF=1 -> JZ a HLT (0x22)
   * 4. Si no, Contador = Contador - 1
   * 5. Producto = Producto + Multiplicando
   * 6. JMP al inicio del bucle
   */
  static getMultiplicationProgram() {
    return [
      0x01, 0x06,       // 0x00: MOV AX, 0x06
      0x07, 0x80,       // 0x02: STORE [0x80], AX   (Multiplicando = 6)
      0x01, 0x07,       // 0x04: MOV AX, 0x07
      0x07, 0x81,       // 0x06: STORE [0x81], AX   (Multiplicador = 7)
      0x01, 0x00,       // 0x08: MOV AX, 0x00
      0x07, 0x82,       // 0x0A: STORE [0x82], AX   (Producto = 0)
      
      // Inicio del Bucle (Dirección 0x0C)
      0x05, 0x81,       // 0x0C: LOAD AX, [0x81]    (Cargar Contador)
      0x18, 0x00,       // 0x0E: CMP AX, 0x00       (¿Contador == 0?)
      0x31, 0x22,       // 0x10: JZ 0x22            (Si Contador==0, salir a HLT)
      0x16,             // 0x12: DEC AX             (Contador = Contador - 1)
      0x07, 0x81,       // 0x13: STORE [0x81], AX   (Guardar Contador)
      0x05, 0x82,       // 0x15: LOAD AX, [0x82]    (Cargar Producto parcial)
      0x06, 0x80,       // 0x17: LOAD BX, [0x80]    (Cargar Multiplicando en BX)
      0x11,             // 0x19: ADD AX, BX         (AX = AX + BX)
      0x07, 0x82,       // 0x1A: STORE [0x82], AX   (Guardar Producto actualizado)
      0x30, 0x0C,       // 0x1C: JMP 0x0C           (Repetir Bucle)
      
      0x00, 0x00, 0x00, // 0x1E - 0x21: NOP de relleno
      0xFF              // 0x22: HLT (Fin del programa)
    ];
  }

  /**
   * Programa 2: Serie de Fibonacci hasta desbordamiento de 8 bits (233d / 0xE9)
   * 
   * Segmento de Datos (Variables):
   * - 0x80: F(n-2) = Inicialmente 0x00
   * - 0x81: F(n-1) = Inicialmente 0x01
   * - 0x82: F(n)   = Nuevo término calculado
   * 
   * Genera los términos: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233 (0xE9).
   */
  static getFibonacciProgram() {
    return [
      0x01, 0x00,       // 0x00: MOV AX, 0x00
      0x07, 0x80,       // 0x02: STORE [0x80], AX   (F_prev2 = 0)
      0x01, 0x01,       // 0x04: MOV AX, 0x01
      0x07, 0x81,       // 0x06: STORE [0x81], AX   (F_prev1 = 1)
      
      // Inicio del Bucle Fibonacci (Dirección 0x08)
      0x05, 0x80,       // 0x08: LOAD AX, [0x80]    (AX = F_prev2)
      0x06, 0x81,       // 0x0A: LOAD BX, [0x81]    (BX = F_prev1)
      0x11,             // 0x0C: ADD AX, BX         (AX = F_prev2 + F_prev1)
      0x07, 0x82,       // 0x0D: STORE [0x82], AX   (F_nuevo = AX)
      
      // Desplazamiento de variables para la siguiente iteración
      0x03,             // 0x0F: MOV AX, BX         (AX = F_prev1)
      0x07, 0x80,       // 0x10: STORE [0x80], AX   (F_prev2 = F_prev1)
      0x05, 0x82,       // 0x12: LOAD AX, [0x82]    (AX = F_nuevo)
      0x07, 0x81,       // 0x14: STORE [0x81], AX   (F_prev1 = F_nuevo)
      
      // Condición de Parada: ¿Llegamos al término límite 233 (0xE9)?
      0x18, 0xE9,       // 0x16: CMP AX, 0xE9
      0x31, 0x1E,       // 0x18: JZ 0x1E            (Si AX == 233, saltar a HLT)
      0x30, 0x08,       // 0x1A: JMP 0x08           (Repetir cálculo)
      
      0x00, 0x00,       // 0x1C - 0x1D: NOP
      0xFF              // 0x1E: HLT (Fin del programa)
    ];
  }
}
