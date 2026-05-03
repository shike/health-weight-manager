#!/usr/bin/env node
/**
 * index.js — 统一入口模块
 *
 * 导出所有业务模块的公共 API，供 OpenClaw 或其他调用方使用。
 */

const { init } = require('./init');
const { record, parseWeightInput, hasRecordedToday, getTodayStr } = require('./record');
const { query, readAllRecords, formatDate, formatChange } = require('./query');
const { generateTrendReport, generateWeeklyReport, groupByWeek, getWeekNumber } = require('./report');
const { morningReminder, healthReminder } = require('./reminder');
const { doExport, exportToCSV } = require('./export');

module.exports = {
  // init
  init,

  // record
  record,
  parseWeightInput,
  hasRecordedToday,
  getTodayStr,

  // query
  query,
  readAllRecords,
  formatDate,
  formatChange,

  // report
  generateTrendReport,
  generateWeeklyReport,
  groupByWeek,
  getWeekNumber,

  // reminder
  morningReminder,
  healthReminder,

  // export
  doExport,
  exportToCSV
};
