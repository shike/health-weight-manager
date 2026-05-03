const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { generateTrendReport, generateWeeklyReport, getWeekNumber } = require('../scripts/report');

describe('report.js', () => {
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

  function writeConfig(config) {
    const configPath = path.join(tempDir, 'data', 'user_config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  describe('getWeekNumber', () => {
    it('计算 ISO 周编号', () => {
      const date = new Date('2026-04-26'); // 周日
      const week = getWeekNumber(date);
      assert.ok(typeof week === 'number');
      assert.ok(week >= 1 && week <= 53);
    });
  });

  describe('generateTrendReport', () => {
    it('TC-RPT-01: 生成周趋势报告', () => {
      // 生成 4 周数据，每周 7 天，体重递减
      const records = [];
      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 7; day++) {
          const date = new Date('2026-03-30T07:00:00+08:00'); // 周一开始
          date.setDate(date.getDate() + week * 7 + day);
          records.push({
            timestamp: date.toISOString(),
            weight: 66.0 - week * 0.2 - day * 0.01,
            note: ''
          });
        }
      }
      writeRecords(records);

      const result = generateTrendReport({ weeks: 4, dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.type, 'trend');
      assert.ok(Array.isArray(result.weeks));
      assert.ok(result.weeks.length >= 2);
      // 趋势应该是下降的
      assert.ok(result.totalChange < 0, `总变化应为负数，实际是 ${result.totalChange}`);
    });

    it('TC-RPT-03: 数据不足时的趋势报告', () => {
      const records = [
        { timestamp: '2026-04-26T07:00:00+08:00', weight: 65.4, note: '' },
        { timestamp: '2026-04-25T07:00:00+08:00', weight: 65.6, note: '' }
      ];
      writeRecords(records);

      const result = generateTrendReport({ weeks: 4, dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.type, 'trend');
      // 只有 2 天数据，可能只有 1 周或更少
      assert.ok(result.weeks.length >= 1);
    });

    it('空数据返回友好消息', () => {
      const result = generateTrendReport({ dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.type, 'trend');
      assert.strictEqual(result.weeks.length, 0);
      assert.ok(result.message.includes('暂无'));
    });
  });

  describe('generateWeeklyReport', () => {
    it('TC-RPT-02: 生成周报', () => {
      const now = new Date();
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      const records = [];
      // 本周 5 条记录
      for (let i = 0; i < 5; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        date.setHours(7, 0, 0, 0);
        records.push({
          timestamp: date.toISOString(),
          weight: 65.5 - i * 0.1,
          note: ''
        });
      }

      // 上周 7 条记录
      const lastWeekStart = new Date(currentWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      for (let i = 0; i < 7; i++) {
        const date = new Date(lastWeekStart);
        date.setDate(date.getDate() + i);
        date.setHours(7, 0, 0, 0);
        records.push({
          timestamp: date.toISOString(),
          weight: 66.0 - i * 0.05,
          note: ''
        });
      }

      writeRecords(records);
      writeConfig({ target_weight: 62.0 });

      const result = generateWeeklyReport({ dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.type, 'weekly');
      assert.ok(result.currentWeek.average !== null);
      assert.ok(result.lastWeek.average !== null);
      assert.ok(result.currentWeek.highest !== null);
      assert.ok(result.currentWeek.lowest !== null);
      assert.strictEqual(result.currentWeek.count, 5);
      assert.strictEqual(result.lastWeek.count, 7);
      assert.strictEqual(result.targetWeight, 62.0);
      assert.ok(result.targetRemaining !== null);
    });

    it('空数据返回友好消息', () => {
      const result = generateWeeklyReport({ dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result.type, 'weekly');
      assert.ok(result.message.includes('暂无'));
    });
  });
});
