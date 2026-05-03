#!/usr/bin/env node
/**
 * query.js — 查询体重记录
 *
 * 用法: node scripts/query.js [days]
 * 或作为模块: const { query } = require('./query'); query({ days: 7 });
 */

const { getDataDir, readAllRecords } = require('./utils');

/**
 * 解析日期字符串为本地日期对象
 */
function parseDate(timestamp) {
  return new Date(timestamp);
}

/**
 * 格式化日期为 MM/DD 星期X
 */
function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}  ${weekday}`;
}

/**
 * 格式化时间差（与前一天比较）
 */
function formatChange(current, previous) {
  if (previous === null || previous === undefined) return '';
  const diff = current - previous;
  const rounded = Math.round(diff * 10) / 10;
  if (rounded > 0) return `⬆️ +${rounded}`;
  if (rounded < 0) return `⬇️ ${rounded}`;
  return '➡️ 0.0';
}

/**
 * 查询体重记录
 * @param {Object} options
 * @param {number} options.days - 查询最近多少天（默认 7）
 * @param {string} options.dataDir - 数据目录路径（可选）
 * @returns {{ records: Array, average: number|null, max: number|null, min: number|null, count: number }}
 */
function query(options = {}) {
  const days = options.days || 7;
  const dir = options.dataDir || getDataDir();

  const allRecords = readAllRecords(dir);

  if (allRecords.length === 0) {
    return {
      records: [],
      average: null,
      max: null,
      min: null,
      count: 0
    };
  }

  // 按日期分组（每天只保留最后一条）
  const dailyMap = new Map();
  for (const record of allRecords) {
    const date = new Date(record.timestamp);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    // 同一天保留时间更晚的记录
    const existing = dailyMap.get(dateKey);
    if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
      dailyMap.set(dateKey, record);
    }
  }

  // 转换为数组，按日期倒序
  const dailyRecords = Array.from(dailyMap.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // 取最近 N 天
  const recentRecords = dailyRecords.slice(0, days);

  // 计算统计值
  const weights = recentRecords.map(r => r.weight);
  const average = Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 10) / 10;
  const max = Math.max(...weights);
  const min = Math.min(...weights);

  // 组装返回数据（包含格式化和变化量）
  const formattedRecords = recentRecords.map((record, index) => {
    const date = parseDate(record.timestamp);
    const prevRecord = recentRecords[index + 1];
    const prevWeight = prevRecord ? prevRecord.weight : null;

    return {
      timestamp: record.timestamp,
      weight: record.weight,
      note: record.note || '',
      dateStr: formatDate(date),
      change: formatChange(record.weight, prevWeight)
    };
  });

  return {
    records: formattedRecords,
    average,
    max,
    min,
    count: recentRecords.length
  };
}

// CLI 入口
if (require.main === module) {
  const days = parseInt(process.argv[2], 10) || 7;
  const result = query({ days });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { query, readAllRecords, formatDate, formatChange };
