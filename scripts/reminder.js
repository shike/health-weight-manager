#!/usr/bin/env node
/**
 * reminder.js — 组装提醒消息
 *
 * 用法:
 *   node scripts/reminder.js morning   # 早晨称重提醒
 *   node scripts/reminder.js health    # 健康小贴士
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
 * 获取今日日期字符串 (YYYY-MM-DD)
 */
function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 检查今日是否已记录
 */
function hasRecordedToday(records) {
  const todayStr = getTodayStr();
  return records.some(r => r.timestamp.startsWith(todayStr));
}

/**
 * 获取最近一次记录
 */
function getLastRecord(records) {
  if (records.length === 0) return null;
  return records[records.length - 1];
}

/**
 * 生成早晨称重提醒
 */
function morningReminder(options = {}) {
  const dir = options.dataDir || getDataDir();
  const records = readAllRecords(dir);

  // 如果今天已记录，跳过
  if (hasRecordedToday(records)) {
    return null;
  }

  const config = readConfig(dir);
  const lastRecord = getLastRecord(records);

  let message = '🌅 早上好！该记录今天的体重啦～\n';
  message += '请直接回复你的体重（单位：kg），例如：65.4';

  if (lastRecord && config.target_weight) {
    const diff = Math.round((lastRecord.weight - config.target_weight) * 10) / 10;
    message += `\n\n🎯 上次记录：${lastRecord.weight} kg，距目标还剩 ${diff} kg`;
  } else if (lastRecord) {
    message += `\n\n📌 上次记录：${lastRecord.weight} kg`;
  }

  return {
    type: 'morning',
    message,
    skip: false
  };
}

/**
 * 生成健康小贴士提醒
 */
function healthReminder(options = {}) {
  const dir = options.dataDir || getDataDir();
  const tips = readHealthTips(dir);

  if (tips.length === 0) {
    return null;
  }

  // 随机选择一条
  const randomIndex = Math.floor(Math.random() * tips.length);
  const tip = tips[randomIndex];

  return {
    type: 'health',
    message: `💡 健康小贴士\n━━━━━━━━━━━━━━━━━━━━\n${tip}\n━━━━━━━━━━━━━━━━━━━━`,
    tip
  };
}

// CLI 入口
if (require.main === module) {
  const [,, subCommand] = process.argv;

  if (subCommand === 'morning') {
    const result = morningReminder();
    if (result) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(JSON.stringify({ skip: true, reason: '今天已记录' }, null, 2));
    }
  } else if (subCommand === 'health') {
    const result = healthReminder();
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error('用法:');
    console.error('  node scripts/reminder.js morning');
    console.error('  node scripts/reminder.js health');
    process.exit(1);
  }
}

module.exports = { morningReminder, healthReminder, hasRecordedToday, getLastRecord };
