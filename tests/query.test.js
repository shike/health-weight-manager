const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { query, formatDate, formatChange } = require('../scripts/query');

describe('query.js', () => {
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

  describe('formatDate', () => {
    it('格式化日期为 MM/DD 星期X', () => {
      const date = new Date('2026-04-26T07:15:00+08:00');
      const result = formatDate(date);
      assert.ok(result.includes('04/26'));
      assert.ok(result.includes('周'));
    });
  });

  describe('formatChange', () => {
    it('体重下降显示向下箭头', () => {
      assert.ok(formatChange(65.2, 65.4).includes('⬇️'));
      assert.ok(formatChange(65.2, 65.4).includes('-0.2'));
    });

    it('体重上升显示向上箭头', () => {
      assert.ok(formatChange(65.6, 65.4).includes('⬆️'));
      assert.ok(formatChange(65.6, 65.4).includes('+0.2'));
    });

    it('无变化显示横箭头', () => {
      assert.ok(formatChange(65.4, 65.4).includes('➡️'));
    });

    it('无上一条记录返回空', () => {
      assert.strictEqual(formatChange(65.4, null), '');
    });
  });

  describe('query', () => {
    it('TC-QRY-01: 查询最近 7 天记录', () => {
      const records = [];
      for (let i = 0; i < 14; i++) {
        const date = new Date('2026-04-26T07:00:00+08:00');
        date.setDate(date.getDate() - i);
        records.push({
          timestamp: date.toISOString(),
          weight: 65.0 + i * 0.1,
          note: ''
        });
      }
      writeRecords(records);

      const result = query({ days: 7, dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.count, 7);
      assert.strictEqual(result.records.length, 7);
      assert.ok(result.average !== null);
      assert.ok(result.max !== null);
      assert.ok(result.min !== null);
      // 按日期倒序
      assert.ok(result.records[0].weight < result.records[6].weight);
    });

    it('TC-QRY-02: 查询空数据', () => {
      const result = query({ days: 7, dataDir: path.join(tempDir, 'data') });
      assert.deepStrictEqual(result.records, []);
      assert.strictEqual(result.average, null);
      assert.strictEqual(result.max, null);
      assert.strictEqual(result.min, null);
      assert.strictEqual(result.count, 0);
    });

    it('TC-QRY-03: 查询天数超过总记录数', () => {
      const records = [
        { timestamp: '2026-04-26T07:00:00+08:00', weight: 65.4, note: '' },
        { timestamp: '2026-04-25T07:00:00+08:00', weight: 65.6, note: '' },
        { timestamp: '2026-04-24T07:00:00+08:00', weight: 65.8, note: '' }
      ];
      writeRecords(records);

      const result = query({ days: 7, dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.count, 3);
      assert.strictEqual(result.records.length, 3);
    });

    it('同一天多条记录取最后一条', () => {
      const records = [
        { timestamp: '2026-04-26T07:00:00+08:00', weight: 65.0, note: '早上' },
        { timestamp: '2026-04-26T21:00:00+08:00', weight: 65.5, note: '晚上' },
        { timestamp: '2026-04-25T07:00:00+08:00', weight: 65.4, note: '' }
      ];
      writeRecords(records);

      const result = query({ days: 7, dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.count, 2);
      // 4/26 应该取晚上那条
      const apr26 = result.records.find(r => r.dateStr.includes('04/26'));
      assert.ok(apr26);
      assert.strictEqual(apr26.weight, 65.5);
    });
  });
});
