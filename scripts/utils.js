#!/usr/bin/env node
/**
 * utils.js — 公共工具函数
 *
 * 提供数据目录操作、文件读写、记录解析、时区处理等通用能力。
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_TIMEZONE = 'Asia/Shanghai';

/**
 * 获取数据目录路径
 */
function getDataDir() {
  return path.resolve(__dirname, '..', 'data');
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 安全写入文件（不覆盖已有文件）
 */
function safeWriteFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    return false;
  }
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  return true;
}

/**
 * 读取所有体重记录
 * @param {string} dataDir - 数据目录路径
 * @returns {Array<{timestamp: string, weight: number, note: string}>}
 */
function readAllRecords(dataDir) {
  const recordsPath = path.join(dataDir, 'weight_records.jsonl');
  if (!fs.existsSync(recordsPath)) {
    return [];
  }

  const content = fs.readFileSync(recordsPath, 'utf-8').trim();
  if (!content) {
    return [];
  }

  const lines = content.split('\n').filter(line => line.trim());
  const records = [];

  for (const line of lines) {
    try {
      const record = JSON.parse(line);
      if (record.timestamp && typeof record.weight === 'number') {
        records.push(record);
      }
    } catch {
      // 忽略解析失败的行
    }
  }

  // 按时间戳排序（从早到晚）
  records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return records;
}

/**
 * 读取用户配置
 * @param {string} dataDir - 数据目录路径
 * @returns {{target_weight: number|null, [key: string]: any}}
 */
function readConfig(dataDir) {
  const configPath = path.join(dataDir, 'user_config.json');
  if (!fs.existsSync(configPath)) {
    return { target_weight: null };
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return { target_weight: null };
  }
}

/**
 * 读取健康小贴士库
 * @param {string} dataDir - 数据目录路径
 * @returns {string[]}
 */
function readHealthTips(dataDir) {
  const tipsPath = path.join(dataDir, 'health_tips.json');
  if (!fs.existsSync(tipsPath)) {
    return [
      '💧 记得每小时喝一杯水，促进新陈代谢！',
      '🚶 久坐后起来走动 5 分钟，活动一下筋骨。',
      '🥗 晚餐尽量清淡，控制碳水摄入有助于体重管理。'
    ];
  }
  try {
    return JSON.parse(fs.readFileSync(tipsPath, 'utf-8'));
  } catch {
    return ['💡 保持健康的生活方式！'];
  }
}

/**
 * 获取今日日期字符串 (YYYY-MM-DD)
 * @param {string} timezone - 时区（默认 Asia/Shanghai）
 * @returns {string}
 */
function getTodayStr(timezone = DEFAULT_TIMEZONE) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

/**
 * 判断某条记录是否为今日记录（基于指定时区）
 * @param {{timestamp: string}} record - 单条记录
 * @param {string} timezone - 时区（默认 Asia/Shanghai）
 * @returns {boolean}
 */
function isRecordedToday(record, timezone = DEFAULT_TIMEZONE) {
  if (!record || !record.timestamp) {
    return false;
  }
  const recordDate = new Date(record.timestamp);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayStr = formatter.format(new Date());
  const recordDateStr = formatter.format(recordDate);
  return recordDateStr === todayStr;
}

/**
 * 检查今日是否已有记录（基于指定时区）
 * @param {Array} records - 已排序的记录数组
 * @param {string} timezone - 时区（默认 Asia/Shanghai）
 * @returns {boolean}
 */
function hasRecordedToday(records, timezone = DEFAULT_TIMEZONE) {
  return records.some(r => isRecordedToday(r, timezone));
}

module.exports = {
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
};
