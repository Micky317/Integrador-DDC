const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Iniciando Unit Tests para formatToPostgresDate...');

// 1. Cargar dinámicamente el código de prescripcion.service.ts
const filePath = path.join(__dirname, '../prescripcion.service.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Extraer el cuerpo de la función usando una expresión regular
const functionMatch = fileContent.match(/function formatToPostgresDate[\s\S]*?\n\}/);
if (!functionMatch) {
  console.error('❌ ERROR: No se encontró la función formatToPostgresDate en prescripcion.service.ts');
  process.exit(1);
}

// Compilar la función dinámicamente en Node.js, limpiando tipos TypeScript
let formatToPostgresDateCode = functionMatch[0];
formatToPostgresDateCode = formatToPostgresDateCode
  .replace(/:\s*string\s*\|\s*undefined/g, '')
  .replace(/:\s*string\s*\|\s*null/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*any/g, '');

const formatToPostgresDate = new Function('dateStr', `
  ${formatToPostgresDateCode};
  return formatToPostgresDate(dateStr);
`);

// 2. Definir Casos de Prueba
const testCases = [
  { input: undefined, expected: null, desc: 'Entrada undefined' },
  { input: '', expected: null, desc: 'Cadena vacía' },
  { input: '   ', expected: null, desc: 'Espacios en blanco' },
  { input: '2026-06-12', expected: '2026-06-12', desc: 'Formato estándar AAAA-MM-DD' },
  { input: '2026/06/12', expected: '2026-06-12', desc: 'Formato estándar AAAA/MM/DD con barras' },
  { input: '2026-6-5', expected: '2026-06-05', desc: 'Formato AAAA-M-D sin ceros a la izquierda' },
  { input: '12-06-2026', expected: '2026-06-12', desc: 'Formato latinoamericano DD-MM-AAAA' },
  { input: '12/06/2026', expected: '2026-06-12', desc: 'Formato latinoamericano DD/MM/AAAA con barras' },
  { input: '8-5-2026', expected: '2026-05-08', desc: 'Formato D-M-AAAA sin ceros a la izquierda' },
  { input: '08/05/2026', expected: '2026-05-08', desc: 'Formato DD/MM/AAAA sin fallas' },
  { input: 'fecha-invalida', expected: 'fecha-invalida', desc: 'Fecha inválida no estructurada (debe retornar tal cual)' }
];

// 3. Ejecutar Casos de Prueba
let passedCount = 0;
let failedCount = 0;

testCases.forEach((tc, index) => {
  try {
    const result = formatToPostgresDate(tc.input);
    assert.strictEqual(result, tc.expected);
    console.log(`✅ Test #${index + 1} Pasó: ${tc.desc} (${JSON.stringify(tc.input)} -> ${JSON.stringify(result)})`);
    passedCount++;
  } catch (error) {
    console.error(`❌ Test #${index + 1} FALLÓ: ${tc.desc}`);
    console.error(`   Entrada:  ${JSON.stringify(tc.input)}`);
    console.error(`   Esperado: ${JSON.stringify(tc.expected)}`);
    console.error(`   Obtenido: ${JSON.stringify(error.actual)}`);
    failedCount++;
  }
});

console.log('\n======================================');
if (failedCount === 0) {
  console.log(`🎉 ¡TODOS LOS TESTS PASARON CON ÉXITO! (${passedCount}/${passedCount})`);
  process.exit(0);
} else {
  console.error(`🚨 ALGUNOS TESTS FALLARON: ${failedCount} test(s) fallido(s).`);
  process.exit(1);
}
