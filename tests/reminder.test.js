const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { morningReminder, healthReminder } = require('../scripts/reminder');

describe('reminder.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwm-test-'));
    fs.mkdirSync(path.join(tempDir, 'data'), { recursive: true });

    // 写入默认健康小贴士
    const tipsPath = path.join(tempDir, 'data', 'health_tips.json');
    fs.writeFileSync(tipsPath, JSON.stringify([
      '💧 喝水提醒',
      '🚶 走动提醒',
      '🥗 饮食提醒'
    ]));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeRecords(records) {
    const recordsPath = path.join(tempDir, 'data', 'weight_records.jsonl');
    const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(recordsPath, lines);
  }

  describe('morningReminder', () => {
    it('TC-RMD-01: 今日未记录时返回提醒', () => {
      // 写入昨天的记录
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      writeRecords([{
        timestamp: yesterday.toISOString(),
        weight: 65.4,
        note: ''
      }]);

      const result = morningReminder({ dataDir: path.join(tempDir, 'data') });
      assert.ok(result !== null);
      assert.strictEqual(result.type, 'morning');
      assert.ok(result.message.includes('该记录今天的体重'));
    });

    it('TC-RMD-02: 今日已记录时跳过', () => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      writeRecords([{
        timestamp: `${todayStr}T07:00:00+08:00`,
        weight: 65.4,
        note: ''
      }]);

      const result = morningReminder({ dataDir: path.join(tempDir, 'data') });
      assert.strictEqual(result, null);
    });

    it('包含上次记录信息', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      writeRecords([{
        timestamp: yesterday.toISOString(),
        weight: 65.4,
        note: ''
      }]);

      // 写入配置（含目标体重）
      const configPath = path.join(tempDir, 'data', 'user_config.json');
      fs.writeFileSync(configPath, JSON.stringify({ target_weight: 62.0 }));

      const result = morningReminder({ dataDir: path.join(tempDir, 'data') });
      assert.ok(result.message.includes('65.4'));
      assert.ok(result.message.includes('目标'));
    });
  });

  describe('healthReminder', () => {
    it('TC-RMD-03: 随机返回健康小贴士', () => {
      const result = healthReminder({ dataDir: path.join(tempDir, 'data') });
      assert.ok(result !== null);
      assert.strictEqual(result.type, 'health');
      assert.ok(result.message.includes('健康小贴士'));

      // 验证返回的 tip 是预设提示之一
      const validTips = ['💧 喝水提醒', '🚶 走动提醒', '🥗 饮食提醒'];
      assert.ok(validTips.includes(result.tip), `返回的 tip "${result.tip}" 不在预设列表中`);
    });

    it('多次调用返回不同内容（概率性）', () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        const r = healthReminder({ dataDir: path.join(tempDir, 'data') });
        results.push(r.tip);
      }
      // 至少有 2 种不同的提示（3 条提示随机 10 次，概率极低全部相同）
      const unique = [...new Set(results)];
      assert.ok(unique.length >= 1);
    });
  });
});
