const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { init } = require('../scripts/init');
const { record } = require('../scripts/record');
const { query } = require('../scripts/query');
const { generateWeeklyReport } = require('../scripts/report');
const { doExport } = require('../scripts/export');

describe('Integration Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hwm-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('TC-INT-01: 新用户首次使用完整流程', () => {
    const dataDir = path.join(tempDir, 'data');

    // 1. 初始化
    init(dataDir);
    assert.ok(fs.existsSync(dataDir));

    // 2. 设置目标体重
    const configPath = path.join(dataDir, 'user_config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.target_weight = 62.0;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // 3. 记录体重
    const recordResult = record('65.4', dataDir);
    assert.strictEqual(recordResult.success, true);

    // 4. 查询记录
    const queryResult = query({ days: 7, dataDir });
    assert.strictEqual(queryResult.count, 1);
    assert.strictEqual(queryResult.average, 65.4);

    // 5. 生成周报
    const reportResult = generateWeeklyReport({ dataDir });
    assert.strictEqual(reportResult.type, 'weekly');
    assert.strictEqual(reportResult.targetWeight, 62.0);

    // 6. 导出数据
    const exportResult = doExport({ dataDir });
    assert.strictEqual(exportResult.success, true);
    assert.strictEqual(exportResult.count, 1);
  });

  it('TC-INT-02: 多天记录与趋势分析', () => {
    const dataDir = path.join(tempDir, 'data');
    init(dataDir);

    // 连续 14 天记录，体重递减
    for (let i = 0; i < 14; i++) {
      const date = new Date('2026-04-13T07:00:00+08:00');
      date.setDate(date.getDate() + i);
      const weight = 66.0 - i * 0.1;

      // 直接写入记录文件（模拟多天记录）
      const recordsPath = path.join(dataDir, 'weight_records.jsonl');
      const line = JSON.stringify({
        timestamp: date.toISOString(),
        weight: Math.round(weight * 10) / 10,
        note: ''
      }) + '\n';
      fs.appendFileSync(recordsPath, line);
    }

    // 查询趋势
    const { generateTrendReport } = require('../scripts/report');
    const trendResult = generateTrendReport({ weeks: 2, dataDir });
    assert.strictEqual(trendResult.type, 'trend');
    assert.ok(trendResult.totalChange < 0, '体重应呈下降趋势');

    // 验证总变化量大约为 -1.4 (14天 * 0.1)
    // 注意：由于按周平均，实际值可能略有不同
    assert.ok(trendResult.totalChange <= -0.5, `总变化量应明显为负，实际是 ${trendResult.totalChange}`);
  });

  it('多次记录体重追加正确', () => {
    const dataDir = path.join(tempDir, 'data');
    init(dataDir);

    // 使用不同日期的记录，避免同一天去重
    const dates = [
      new Date(Date.now() - 2 * 86400000),
      new Date(Date.now() - 86400000),
      new Date()
    ];
    const weights = [65.4, 65.2, 65.0];

    for (let i = 0; i < 3; i++) {
      const recordsPath = path.join(dataDir, 'weight_records.jsonl');
      const line = JSON.stringify({
        timestamp: dates[i].toISOString(),
        weight: weights[i],
        note: ''
      }) + '\n';
      fs.appendFileSync(recordsPath, line);
    }

    const queryResult = query({ days: 7, dataDir });
    assert.strictEqual(queryResult.count, 3);
    assert.strictEqual(queryResult.min, 65.0);
    assert.strictEqual(queryResult.max, 65.4);
  });
});
