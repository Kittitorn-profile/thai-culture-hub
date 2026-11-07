const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/sections/contact/contact-schema.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exported = {};
new Function('require', 'exports', compiled)(require, exported);
const { ContactSchema } = exported;
const valid = {
  name: 'ผู้ใช้งาน',
  email: 'user@example.com',
  phone: '',
  area: '',
  message: 'ขอแจ้งข้อมูลสถานที่ไม่ถูกต้อง',
};

test('accepts a required email and optional formatted phone numbers', () => {
  for (const phone of ['', '0812345678', '02-123-4567', '+66 81 234 5678'])
    assert.equal(ContactSchema.safeParse({ ...valid, phone }).success, true);
});
test('required fields reject empty or whitespace-only input', () => {
  for (const name of ['name', 'email', 'message']) {
    const result = ContactSchema.safeParse({ ...valid, [name]: '   ' });
    assert.equal(result.success, false);
    assert.equal(result.error.issues[0].path[0], name);
  }
});
test('email and phone are validated independently', () => {
  for (const email of ['user@', 'abc', '0812345678'])
    assert.equal(ContactSchema.safeParse({ ...valid, email }).success, false);
  for (const phone of ['123', '1234567890123456', '081hello5678', 'user@example.com'])
    assert.equal(ContactSchema.safeParse({ ...valid, phone }).success, false);
});
test('area is optional and surrounding whitespace is removed before submission', () => {
  assert.deepEqual(
    ContactSchema.parse({
      name: ' ทีมงาน ',
      email: ' user@example.com ',
      phone: ' ',
      area: ' ',
      message: ' ข้อเสนอแนะ ',
    }),
    { name: 'ทีมงาน', email: 'user@example.com', phone: '', area: '', message: 'ข้อเสนอแนะ' }
  );
});
test('rejects overlong field values', () => {
  for (const [field, length] of [
    ['name', 121],
    ['area', 201],
    ['message', 5001],
  ])
    assert.equal(ContactSchema.safeParse({ ...valid, [field]: 'ก'.repeat(length) }).success, false);
});
