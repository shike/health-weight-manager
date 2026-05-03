const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  getDataDir,
  ensureDir,
  safeWriteFile,
  readAllRecords,
  readConfig,
  readHealthTips,
  getTodayStr,
  isRecordedToday,
  hasRecordedToday,
  DEFAULT_TIMEZONE
} = require('../scripts/utils');

describe('utils.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwm-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('ensureDir', () => {
    it('创建不存在的目录', () => {
      const dir = path.join(tempDir, 'nested', 'dir');
      ensureDir(dir);
      assert.strictEqual(fs.existsSync(dir), true);
    });

    it('已存在目录不报错', () => {
      ensureDir(tempDir);
      assert.strictEqual(fs.existsSync(tempDir), true);
    });
  });

  describe('safeWriteFile', () => {
    it('首次写入成功', () => {
      const filePath = path.join(tempDir, 'test.txt');
      const result = safeWriteFile(filePath, 'hello');
      assert.strictEqual(result, true);
      assert.strictEqual(fs.readFileSync(filePath, 'utf-8'), 'hello');
    });

    it('已存在文件不覆盖', () => {
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'original');
      const result = safeWriteFile(filePath, 'new');
      assert.strictEqual(result, false);
      assert.strictEqual(fs.readFileSync(filePath, 'utf-8'), 'original');
    });
  });

  describe('readAllRecords', () => {
    it('空目录返回空数组', () => {
      const records = readAllRecords(tempDir);
      assert.deepStrictEqual(records, []);
    });

    it('解析并排序记录', () => {
      const recordsPath = path.join(tempDir, 'weight_records.jsonl');
      fs.writeFileSync(recordsPath, [
        JSON.stringify({ timestamp: '2026-04-25T07:00:00Z', weight: 65.6, note: '' }),
        JSON.stringify({ timestamp: '2026-04-26T07:00:00Z', weight: 65.4, note: '' })
      ].join('\n'));

      const records = readAllRecords(tempDir);
      assert.strictEqual(records.length, 2);
      assert.strictEqual(records[0].weight, 65.6); // 较早的记录排前面
      assert.strictEqual(records[1].weight, 65.4);
    });

    it('忽略解析失败的行', () => {
      const recordsPath = path.join(tempDir, 'weight_records.jsonl');
      fs.writeFileSync(recordsPath, [
        JSON.stringify({ timestamp: '2026-04-26T07:00:00Z', weight: 65.4, note: '' }),
        'invalid json',
        JSON.stringify({ timestamp: '2026-04-25T07:00:00Z', weight: 65.6 }),
        ''
      ].join('\n'));

      const records = readAllRecords(tempDir);
      assert.strictEqual(records.length, 2);
    });
  });

  describe('readConfig', () => {
    it('文件不存在返回默认配置', () => {
      const config = readConfig(tempDir);
      assert.deepStrictEqual(config, { target_weight: null });
    });

    it('读取现有配置', () => {
      const configPath = path.join(tempDir, 'user_config.json');
      fs.writeFileSync(configPath, JSON.stringify({ target_weight: 62.0, timezone: 'UTC' }));

      const config = readConfig(tempDir);
      assert.strictEqual(config.target_weight, 62.0);
      assert.strictEqual(config.timezone, 'UTC');
    });

    it('损坏的配置文件返回默认配置', () => {
      const configPath = path.join(tempDir, 'user_config.json');
      fs.writeFileSync(configPath, 'not json');

      const config = readConfig(tempDir);
      assert.deepStrictEqual(config, { target_weight: null });
    });
  });

  describe('readHealthTips', () => {
    it('文件不存在返回默认提示', () => {
      const tips = readHealthTips(tempDir);
      assert.ok(Array.isArray(tips));
      assert.ok(tips.length >= 3);
    });

    it('读取现有提示文件', () => {
      const tipsPath = path.join(tempDir, 'health_tips.json');
      fs.writeFileSync(tipsPath, JSON.stringify(['自定义提示']));

      const tips = readHealthTips(tempDir);
      assert.deepStrictEqual(tips, ['自定义提示']);
    });
  });

  describe('getTodayStr', () => {
    it('返回 YYYY-MM-DD 格式', () => {
      const today = getTodayStr();
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(today));
    });

    it('不同时区可能返回不同日期', () => {
      // 使用极端时区对比（仅验证函数能接受不同时区参数）
      const shanghai = getTodayStr('Asia/Shanghai');
      const utc = getTodayStr('UTC');
      // 在大多数时间下它们可能相同也可能不同，这里只验证格式
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(shanghai));
      assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(utc));
    });
  });

  describe('isRecordedToday', () => {
    it('今日记录返回 true', () => {
      const now = new Date();
      const record = { timestamp: now.toISOString(), weight: 65.4 };
      assert.strictEqual(isRecordedToday(record, 'UTC'), true);
    });

    it('昨日记录返回 false', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const record = { timestamp: yesterday.toISOString(), weight: 65.4 };
      assert.strictEqual(isRecordedToday(record, 'UTC'), false);
    });

    it('空记录返回 false', () => {
      assert.strictEqual(isRecordedToday(null), false);
      assert.strictEqual(isRecordedToday({}), false);
    });
  });

  describe('hasRecordedToday', () => {
    it('空数组返回 false', () => {
      assert.strictEqual(hasRecordedToday([]), false);
    });

    it('包含今日记录返回 true', () => {
      const now = new Date();
      const records = [
        { timestamp: now.toISOString(), weight: 65.4 }
      ];
      assert.strictEqual(hasRecordedToday(records, 'UTC'), true);
    });

    it('全是历史记录返回 false', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const records = [
        { timestamp: yesterday.toISOString(), weight: 65.4 }
      ];
      assert.strictEqual(hasRecordedToday(records, 'UTC'), false);
    });
  });
});
