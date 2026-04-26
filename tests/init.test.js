const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { init } = require('../scripts/init');

describe('init.js', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwm-test-'));
  });

  afterEach(() => {
    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('TC-INIT-01: 首次初始化创建所有数据文件', () => {
    const dataDir = path.join(tempDir, 'data');
    init(dataDir);

    // 验证目录存在
    assert.strictEqual(fs.existsSync(dataDir), true, '数据目录应存在');

    // 验证 weight_records.jsonl 存在且为空
    const recordsPath = path.join(dataDir, 'weight_records.jsonl');
    assert.strictEqual(fs.existsSync(recordsPath), true);
    assert.strictEqual(fs.readFileSync(recordsPath, 'utf-8'), '');

    // 验证 user_config.json 存在且包含默认值
    const configPath = path.join(dataDir, 'user_config.json');
    assert.strictEqual(fs.existsSync(configPath), true);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(config.reminder_morning, '07:00');
    assert.strictEqual(config.weekly_review_day, 'Sunday');

    // 验证 health_tips.json 存在且不为空
    const tipsPath = path.join(dataDir, 'health_tips.json');
    assert.strictEqual(fs.existsSync(tipsPath), true);
    const tips = JSON.parse(fs.readFileSync(tipsPath, 'utf-8'));
    assert.ok(Array.isArray(tips) && tips.length > 0, '健康小贴士应为非空数组');

    // 验证文件权限
    const stats = fs.statSync(configPath);
    // Windows 不支持 Unix 权限模式，跳过权限检查
    if (process.platform !== 'win32') {
      const mode = stats.mode & 0o777;
      assert.strictEqual(mode, 0o600, '文件权限应为 600');
    }
  });

  it('TC-INIT-02: 重复初始化不覆盖已有数据', () => {
    const dataDir = path.join(tempDir, 'data');
    init(dataDir);

    // 修改配置文件
    const configPath = path.join(dataDir, 'user_config.json');
    const customConfig = { target_weight: 55.0, reminder_morning: '08:00' };
    fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));

    // 再次初始化
    init(dataDir);

    // 验证配置未被覆盖
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.strictEqual(config.target_weight, 55.0);
    assert.strictEqual(config.reminder_morning, '08:00');
  });
});
