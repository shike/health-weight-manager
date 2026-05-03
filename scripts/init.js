#!/usr/bin/env node
/**
 * init.js — 初始化 Health Weight Manager 数据目录和文件
 *
 * 用法: node scripts/init.js [data_dir_path]
 * 默认数据目录: 脚本所在目录的上一级中的 data/ 文件夹
 */

const fs = require('fs');
const path = require('path');
const { ensureDir, safeWriteFile, getDataDir } = require('./utils');

// 默认健康小贴士
const DEFAULT_HEALTH_TIPS = [
  '💧 记得每小时喝一杯水，促进新陈代谢！',
  '🚶 久坐后起来走动 5 分钟，活动一下筋骨。',
  '🥗 晚餐尽量清淡，控制碳水摄入有助于体重管理。',
  '😴 保持 7-8 小时睡眠，睡眠不足会影响代谢。',
  '🍎 用水果代替零食，既解馋又健康。',
  '🧘 睡前做 5 分钟深呼吸，有助于减压和控制食欲。',
  '🥣 早餐一定要吃，不吃早餐反而容易发胖。',
  '🍽️ 细嚼慢咽，给大脑足够时间接收饱腹信号。',
  '🏃 每天走 6000 步，轻松消耗多余热量。',
  '🥛 选择低脂乳制品，补充蛋白质的同时减少脂肪摄入。'
];

// 默认用户配置
const DEFAULT_CONFIG = {
  target_weight: null,
  reminder_morning: '07:00',
  weekly_review_day: 'Sunday',
  weekly_review_time: '20:00',
  health_reminders: ['10:00', '15:00', '20:00'],
  timezone: 'Asia/Shanghai'
};

/**
 * 获取数据目录路径
 */
function resolveDataDir() {
  const customDir = process.argv[2];
  if (customDir) {
    return path.resolve(customDir);
  }
  return getDataDir();
}

/**
 * 初始化数据目录
 */
function init(dataDir) {
  const dir = dataDir || resolveDataDir();
  ensureDir(dir);

  // 1. 创建体重记录文件（空文件）
  const recordsPath = path.join(dir, 'weight_records.jsonl');
  safeWriteFile(recordsPath, '');

  // 2. 创建用户配置文件
  const configPath = path.join(dir, 'user_config.json');
  safeWriteFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n');

  // 3. 创建健康小贴士文件
  const tipsPath = path.join(dir, 'health_tips.json');
  safeWriteFile(tipsPath, JSON.stringify(DEFAULT_HEALTH_TIPS, null, 2) + '\n');

  console.log(`[init] 数据目录初始化完成: ${dir}`);
  return dir;
}

// 如果直接运行此脚本
if (require.main === module) {
  init();
}

module.exports = { init, resolveDataDir, DEFAULT_CONFIG, DEFAULT_HEALTH_TIPS };
