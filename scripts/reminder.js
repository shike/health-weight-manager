#!/usr/bin/env node
/**
 * reminder.js — 组装提醒消息
 *
 * 用法:
 *   node scripts/reminder.js morning   # 早晨称重提醒
 *   node scripts/reminder.js health    # 健康小贴士
 */

const {
  getDataDir,
  readAllRecords,
  readConfig,
  readHealthTips,
  getTodayStr,
  hasRecordedToday,
  DEFAULT_TIMEZONE
} = require('./utils');

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
  const config = readConfig(dir);
  const timezone = config.timezone || DEFAULT_TIMEZONE;

  // 如果今天已记录，跳过
  if (hasRecordedToday(records, timezone)) {
    return null;
  }

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

module.exports = { morningReminder, healthReminder, getLastRecord };
