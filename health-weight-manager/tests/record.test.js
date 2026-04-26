const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { record, parseWeightInput } = require('../scripts/record');

describe('record.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwm-test-'));
    fs.mkdirSync(path.join(tempDir, 'data'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseWeightInput', () => {
    it('TC-REC-01: 解析有效体重', () => {
      const result = parseWeightInput('65.4');
      assert.strictEqual(result.weight, 65.4);
      assert.strictEqual(result.note, '');
    });

    it('TC-REC-02: 解析带备注的体重', () => {
      const result = parseWeightInput('65.4 空腹');
      assert.strictEqual(result.weight, 65.4);
      assert.strictEqual(result.note, '空腹');
    });

    it('TC-REC-03: 拒绝无效输入', () => {
      const result = parseWeightInput('abc');
      assert.strictEqual(result, null);
    });

    it('TC-REC-04: 拒绝负数体重', () => {
      const result = parseWeightInput('-5');
      assert.strictEqual(result, null);
    });

    it('TC-REC-05: 拒绝超出合理范围的体重', () => {
      assert.strictEqual(parseWeightInput('500'), null);
      assert.strictEqual(parseWeightInput('10'), null);
    });

    it('解析整数体重', () => {
      const result = parseWeightInput('70');
      assert.strictEqual(result.weight, 70);
    });

    it('解析带多余空格的输入', () => {
      const result = parseWeightInput('  65.4   空腹  ');
      assert.strictEqual(result.weight, 65.4);
      assert.strictEqual(result.note, '空腹');
    });
  });

  describe('record', () => {
    it('TC-REC-01: 记录有效体重到文件', () => {
      const result = record('65.4', path.join(tempDir, 'data'));
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.weight, 65.4);

      // 验证文件内容
      const recordsPath = path.join(tempDir, 'data', 'weight_records.jsonl');
      const content = fs.readFileSync(recordsPath, 'utf-8').trim();
      const lines = content.split('\n');
      assert.strictEqual(lines.length, 1);

      const recordObj = JSON.parse(lines[0]);
      assert.strictEqual(recordObj.weight, 65.4);
      assert.ok(recordObj.timestamp);
      assert.ok(recordObj.timestamp.includes('T'));
    });

    it('TC-REC-02: 记录带备注的体重', () => {
      const result = record('65.4 空腹', path.join(tempDir, 'data'));
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.note, '空腹');

      const recordsPath = path.join(tempDir, 'data', 'weight_records.jsonl');
      const content = fs.readFileSync(recordsPath, 'utf-8').trim();
      const recordObj = JSON.parse(content);
      assert.strictEqual(recordObj.note, '空腹');
    });

    it('TC-REC-03: 拒绝无效输入不写入文件', () => {
      const result = record('abc', path.join(tempDir, 'data'));
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'INVALID_WEIGHT');

      const recordsPath = path.join(tempDir, 'data', 'weight_records.jsonl');
      assert.strictEqual(fs.existsSync(recordsPath), false);
    });

    it('多条记录追加写入', () => {
      record('65.4', path.join(tempDir, 'data'));
      record('65.2', path.join(tempDir, 'data'));

      const recordsPath = path.join(tempDir, 'data', 'weight_records.jsonl');
      const content = fs.readFileSync(recordsPath, 'utf-8').trim();
      const lines = content.split('\n');
      assert.strictEqual(lines.length, 2);
    });
  });
});
