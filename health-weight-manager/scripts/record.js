#!/usr/bin/env node
/**
 * record.js — 记录体重
 *
 * 用法: node scripts/record.js <weight> [note]
 * 或作为模块: const { record } = require('./record'); record('65.4', '空腹');
 */

const fs = require('fs');
const path = require('path');

const MIN_WEIGHT = 20;   // 最小合理体重 (kg)
const MAX_WEIGHT = 300;  // 最大合理体重 (kg)

/**
 * 获取数据目录路径
 */
function getDataDir() {
  return path.resolve(__dirname, '..', 'data');
}

/**
 * 获取今日日期字符串 (YYYY-MM-DD)
 */
function getTodayStr(timezone = 'Asia/Shanghai') {
  const now = new Date();
  // 使用 Intl.DateTimeFormat 处理时区
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

/**
 * 解析体重输入
 * @param {string} input - 用户输入，如 "65.4" 或 "65.4 空腹"
 * @returns {{ weight: number, note: string } | null}
 */
function parseWeightInput(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  // 匹配数字（支持整数和小数）
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(.*)?$/);

  if (!match) {
    return null;
  }

  const weight = parseFloat(match[1]);
  const note = (match[2] || '').trim();

  if (isNaN(weight) || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
    return null;
  }

  // 保留 1 位小数
  const weightRounded = Math.round(weight * 10) / 10;

  return { weight: weightRounded, note };
}

/**
 * 检查今日是否已记录
 */
function hasRecordedToday(dataDir, timezone) {
  const recordsPath = path.join(dataDir, 'weight_records.jsonl');
  if (!fs.existsSync(recordsPath)) {
    return false;
  }

  const todayStr = getTodayStr(timezone);
  const content = fs.readFileSync(recordsPath, 'utf-8').trim();

  if (!content) return false;

  const lines = content.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record.timestamp && record.timestamp.startsWith(todayStr)) {
        return true;
      }
    } catch {
      // 忽略解析失败的行
    }
  }

  return false;
}

/**
 * 记录体重
 * @param {string} input - 用户输入
 * @param {string} dataDir - 数据目录路径（可选）
 * @returns {{ success: boolean, weight?: number, note?: string, error?: string, alreadyRecorded?: boolean }}
 */
function record(input, dataDir) {
  const dir = dataDir || getDataDir();
  const recordsPath = path.join(dir, 'weight_records.jsonl');

  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 解析输入
  const parsed = parseWeightInput(input);
  if (!parsed) {
    return { success: false, error: 'INVALID_WEIGHT' };
  }

  // 读取时区配置
  let timezone = 'Asia/Shanghai';
  const configPath = path.join(dir, 'user_config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.timezone) timezone = config.timezone;
    } catch {
      // 使用默认时区
    }
  }

  // 构建记录对象
  const now = new Date();
  const timestamp = now.toISOString();

  const recordObj = {
    timestamp,
    weight: parsed.weight,
    note: parsed.note
  };

  // 追加写入
  const line = JSON.stringify(recordObj) + '\n';
  fs.appendFileSync(recordsPath, line, { mode: 0o600 });

  return {
    success: true,
    weight: parsed.weight,
    note: parsed.note
  };
}

// CLI 入口
if (require.main === module) {
  const input = process.argv.slice(2).join(' ');
  if (!input) {
    console.error('用法: node scripts/record.js <weight> [note]');
    console.error('示例: node scripts/record.js 65.4');
    console.error('示例: node scripts/record.js 65.4 空腹');
    process.exit(1);
  }

  const result = record(input);
  if (result.success) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`错误: ${result.error}`);
    process.exit(1);
  }
}

module.exports = { record, parseWeightInput, hasRecordedToday, getTodayStr };
