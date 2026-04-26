const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { doExport, exportToCSV } = require('../scripts/export');

describe('export.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwm-test-'));
    fs.mkdirSync(path.join(tempDir, 'data'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeRecords(records) {
    const recordsPath = path.join(tempDir, 'data', 'weight_records.jsonl');
    const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(recordsPath, lines);
  }

  describe('exportToCSV', () => {
    it('生成正确的 CSV 格式', () => {
      const records = [
        { timestamp: '2026-04-26T07:15:00+08:00', weight: 65.4, note: '空腹' },
        { timestamp: '2026-04-25T07:20:00+08:00', weight: 65.6, note: '' }
      ];

      const csv = exportToCSV(records);
      const lines = csv.trim().split('\n');

      // 验证表头
      assert.strictEqual(lines[0], 'date,time,weight,note');
      // 验证数据行
      assert.ok(lines[1].includes('2026-04-26'));
      assert.ok(lines[1].includes('07:15'))
      assert.ok(lines[1].includes('65.4'));
      assert.ok(lines[1].includes('空腹'));
    });

    it('CSV 转义包含逗号的 note', () => {
      const records = [
        { timestamp: '2026-04-26T07:15:00+08:00', weight: 65.4, note: '吃完早餐, 空腹' }
      ];

      const csv = exportToCSV(records);
      assert.ok(csv.includes('"吃完早餐, 空腹"'));
    });

    it('空记录生成仅含表头的 CSV', () => {
      const csv = exportToCSV([]);
      assert.strictEqual(csv.trim(), 'date,time,weight,note');
    });
  });

  describe('doExport', () => {
    it('TC-EXP-01: 导出数据到文件', () => {
      const records = [
        { timestamp: '2026-04-26T07:15:00+08:00', weight: 65.4, note: '' },
        { timestamp: '2026-04-25T07:20:00+08:00', weight: 65.6, note: '' }
      ];
      writeRecords(records);

      const result = doExport({ dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.count, 2);
      assert.ok(fs.existsSync(result.filePath));

      const content = fs.readFileSync(result.filePath, 'utf-8');
      assert.ok(content.includes('date,time,weight,note'));
      assert.ok(content.includes('65.4'));
    });

    it('TC-EXP-02: 空数据导出', () => {
      const result = doExport({ dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.count, 0);
      assert.ok(fs.existsSync(result.filePath));

      const content = fs.readFileSync(result.filePath, 'utf-8').trim();
      assert.strictEqual(content, 'date,time,weight,note');
    });

    it('不支持格式返回错误', () => {
      const result = doExport({ format: 'pdf', dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'UNSUPPORTED_FORMAT');
    });
  });
});
