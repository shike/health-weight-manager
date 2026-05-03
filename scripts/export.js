#!/usr/bin/env node
/**
 * export.js — 导出体重数据为 CSV
 *
 * 用法: node scripts/export.js [format]
 * 支持格式: csv（默认）
 */

const fs = require('fs');
const path = require('path');
const { getDataDir, readAllRecords } = require('./utils');

/**
 * 导出为 CSV
 */
function exportToCSV(records) {
  const lines = ['date,time,weight,note'];

  for (const record of records) {
    const date = new Date(record.timestamp);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const weight = record.weight.toFixed(1);
    // CSV 转义：如果 note 包含逗号或引号，需要转义
    const note = (record.note || '').replace(/"/g, '""');
    const noteField = note.includes(',') || note.includes('"') || note.includes('\n')
      ? `"${note}"`
      : note;

    lines.push(`${dateStr},${timeStr},${weight},${noteField}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * 执行导出
 * @param {Object} options
 * @param {string} options.format - 导出格式（默认 csv）
 * @param {string} options.dataDir - 数据目录路径（可选）
 * @returns {{ success: boolean, filePath?: string, count?: number, error?: string }}
 */
function doExport(options = {}) {
  const format = options.format || 'csv';
  const dir = options.dataDir || getDataDir();

  if (format !== 'csv') {
    return { success: false, error: 'UNSUPPORTED_FORMAT' };
  }

  const records = readAllRecords(dir);

  // 生成文件名
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const fileName = `weight_export_${timestamp}.csv`;
  const filePath = path.join(dir, fileName);

  const csvContent = exportToCSV(records);
  fs.writeFileSync(filePath, csvContent, { mode: 0o600 });

  return {
    success: true,
    filePath,
    count: records.length
  };
}

// CLI 入口
if (require.main === module) {
  const format = process.argv[2] || 'csv';
  const result = doExport({ format });

  if (result.success) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(`错误: ${result.error}`);
    process.exit(1);
  }
}

module.exports = { doExport, exportToCSV };
