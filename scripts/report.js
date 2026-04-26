#!/usr/bin/env node
/**
 * report.js — 生成体重报告（趋势分析 + 周报）
 *
 * 用法:
 *   node scripts/report.js trend [weeks]     # 生成趋势报告
 *   node scripts/report.js weekly            # 生成周报
 */

const fs = require('fs');
const path = require('path');

function getDataDir() {
  return path.resolve(__dirname, '..', 'data');
}

function readAllRecords(dataDir) {
  const recordsPath = path.join(dataDir, 'weight_records.jsonl');
  if (!fs.existsSync(recordsPath)) return [];

  const content = fs.readFileSync(recordsPath, 'utf-8').trim();
  if (!content) return [];

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

  records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return records;
}

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
 * 获取日期所在的周编号（ISO 周）
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 按周分组并计算每周平均值
 */
function groupByWeek(records) {
  const weekMap = new Map();

  for (const record of records) {
    const date = new Date(record.timestamp);
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    const weekKey = `${year}-W${String(week).padStart(2, '0')}`;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { weights: [], year, week });
    }
    weekMap.get(weekKey).weights.push(record.weight);
  }

  const weeks = [];
  for (const [key, data] of weekMap) {
    const avg = data.weights.reduce((a, b) => a + b, 0) / data.weights.length;
    weeks.push({
      weekKey: key,
      year: data.year,
      week: data.week,
      average: Math.round(avg * 10) / 10,
      count: data.weights.length
    });
  }

  // 按周排序
  weeks.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.week - b.week;
  });

  return weeks;
}

/**
 * 生成趋势报告
 */
function generateTrendReport(options = {}) {
  const weeks = options.weeks || 4;
  const dir = options.dataDir || getDataDir();
  const records = readAllRecords(dir);

  if (records.length === 0) {
    return {
      type: 'trend',
      weeks: [],
      totalChange: null,
      message: '暂无体重记录，开始记录吧！'
    };
  }

  const weekData = groupByWeek(records);

  // 取最近 N 周
  const recentWeeks = weekData.slice(-weeks);

  // 计算每周变化
  const result = recentWeeks.map((week, index) => {
    const prevWeek = index > 0 ? recentWeeks[index - 1] : null;
    const change = prevWeek ? Math.round((week.average - prevWeek.average) * 10) / 10 : null;

    return {
      weekKey: week.weekKey,
      average: week.average,
      change,
      count: week.count
    };
  });

  const totalChange = result.length >= 2
    ? Math.round((result[result.length - 1].average - result[0].average) * 10) / 10
    : null;

  return {
    type: 'trend',
    weeks: result,
    totalChange,
    message: totalChange !== null
      ? `总变化：${totalChange > 0 ? '+' : ''}${totalChange} kg`
      : '数据不足，继续记录以查看趋势。'
  };
}

/**
 * 生成周报
 */
function generateWeeklyReport(options = {}) {
  const dir = options.dataDir || getDataDir();
  const records = readAllRecords(dir);
  const config = readConfig(dir);

  if (records.length === 0) {
    return {
      type: 'weekly',
      message: '暂无体重记录，开始记录吧！'
    };
  }

  // 按日期分组（每天只保留最后一条）
  const dailyMap = new Map();
  for (const record of records) {
    const date = new Date(record.timestamp);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const existing = dailyMap.get(dateKey);
    if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
      dailyMap.set(dateKey, record);
    }
  }

  const dailyRecords = Array.from(dailyMap.values())
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // 计算当前周和上周
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(currentWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(currentWeekStart);
  lastWeekEnd.setMilliseconds(-1);

  const currentWeekRecords = dailyRecords.filter(r => new Date(r.timestamp) >= currentWeekStart);
  const lastWeekRecords = dailyRecords.filter(r => {
    const d = new Date(r.timestamp);
    return d >= lastWeekStart && d <= lastWeekEnd;
  });

  // 计算平均值
  const calcAverage = (arr) => {
    if (arr.length === 0) return null;
    return Math.round((arr.reduce((a, b) => a + b.weight, 0) / arr.length) * 10) / 10;
  };

  const currentAvg = calcAverage(currentWeekRecords);
  const lastAvg = calcAverage(lastWeekRecords);

  // 找最高最低
  let highest = null, lowest = null;
  if (currentWeekRecords.length > 0) {
    const sorted = [...currentWeekRecords].sort((a, b) => a.weight - b.weight);
    lowest = sorted[0];
    highest = sorted[sorted.length - 1];
  }

  // 格式化日期
  const formatShortDate = (timestamp) => {
    const d = new Date(timestamp);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${weekdays[d.getDay()]}`;
  };

  return {
    type: 'weekly',
    currentWeek: {
      average: currentAvg,
      count: currentWeekRecords.length,
      highest: highest ? { weight: highest.weight, date: formatShortDate(highest.timestamp) } : null,
      lowest: lowest ? { weight: lowest.weight, date: formatShortDate(lowest.timestamp) } : null
    },
    lastWeek: {
      average: lastAvg,
      count: lastWeekRecords.length
    },
    change: (currentAvg !== null && lastAvg !== null)
      ? Math.round((currentAvg - lastAvg) * 10) / 10
      : null,
    targetWeight: config.target_weight,
    targetRemaining: (config.target_weight && currentAvg)
      ? Math.round((currentAvg - config.target_weight) * 10) / 10
      : null
  };
}

// CLI 入口
if (require.main === module) {
  const [,, subCommand, arg] = process.argv;

  if (subCommand === 'trend') {
    const weeks = parseInt(arg, 10) || 4;
    const result = generateTrendReport({ weeks });
    console.log(JSON.stringify(result, null, 2));
  } else if (subCommand === 'weekly') {
    const result = generateWeeklyReport();
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error('用法:');
    console.error('  node scripts/report.js trend [weeks]');
    console.error('  node scripts/report.js weekly');
    process.exit(1);
  }
}

module.exports = { generateTrendReport, generateWeeklyReport, groupByWeek, getWeekNumber };
