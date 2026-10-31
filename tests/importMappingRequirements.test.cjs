const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const source = fs.readFileSync(require.resolve('../lib/importMappingRequirements.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = new Module('importMappingRequirements.js');
mod._compile(compiled, 'importMappingRequirements.js');
const { isRequiredMapping } = mod.exports;

test('invoice amount mapped normally', () => {
  assert.equal(isRequiredMapping('amount', { amount: 'Invoice Amount' }), true);
});

test('outstanding or pending amount mapped instead', () => {
  assert.equal(isRequiredMapping('amount', { outstanding: 'Outstanding' }), false);
  assert.equal(isRequiredMapping('amount', { outstanding: 'Pending Amount' }), false);
});

test('neither amount field mapped', () => {
  assert.equal(isRequiredMapping('amount', {}), true);
  assert.equal(isRequiredMapping('amount', { amount: null, outstanding: '' }), true);
});

test('paid amount alone does not replace invoice amount or balance', () => {
  assert.equal(isRequiredMapping('amount', { paid_amount: 'Amount Paid' }), true);
});

test('both amount fields mapped; other required fields remain required', () => {
  const mapping = { amount: 'Invoice Amount', outstanding: 'Balance', customer: 'Customer', invoice_date: 'Date' };
  assert.equal(isRequiredMapping('amount', mapping), false);
  assert.equal(isRequiredMapping('customer', mapping), true);
  assert.equal(isRequiredMapping('invoice_date', mapping), true);
  assert.equal(isRequiredMapping('paid_amount', mapping), false);
});
