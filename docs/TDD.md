# Health Weight Manager — 测试驱动开发文档 (TDD)

> **文档版本**: 1.0.0  
> **对应 Skill 版本**: 1.0.0  
> **测试框架**: Node.js 内置 `node:test` + `node:assert`

---

## 1. 测试策略概述

### 1.1 测试层级

| 层级 | 范围 | 工具 | 文件 |
|------|------|------|------|
| 单元测试 | 单个脚本函数 | `node:test` | `tests/*.test.js` |
| 集成测试 | 脚本 + 数据文件 IO | `node:test` + 临时目录 | `tests/integration.test.js` |
| E2E 测试 | 完整用户交互流程 | 模拟 OpenClaw 环境 | `tests/e2e.test.js` |

### 1.2 测试原则

1. **先写测试，再写实现** — 每个功能先有失败的测试，再编写通过测试的代码
2. **一个测试一个断言** — 尽量保持测试 focused，便于定位问题
3. **隔离数据** — 所有测试使用临时目录，不污染真实数据
4. **快速反馈** — 单个测试执行时间 < 100ms

---

## 2. 测试覆盖矩阵

| 功能编号 | 功能 | 单元测试 | 集成测试 | E2E 测试 |
|---------|------|---------|---------|---------|
| F01 | 早晨体重提醒 | ✅ | ✅ | ✅ |
| F02 | 体重记录 | ✅ | ✅ | ✅ |
| F03 | 体重查询 | ✅ | ✅ | ✅ |
| F04 | 体重趋势分析 | ✅ | ✅ | ✅ |
| F05 | 每周体重回顾 | ✅ | ✅ | ✅ |
| F06 | 每日健康提醒 | ✅ | ✅ | ✅ |
| F07 | 目标体重管理 | ✅ | ✅ | ✅ |
| F08 | 数据导出 | ✅ | ✅ | ✅ |

---

## 3. 测试用例详述

### 模块: `scripts/init.js` — 数据初始化

#### TC-INIT-01: 首次初始化创建所有数据文件

```
Given: 数据目录不存在
When:  调用 init()
Then:  创建 data/ 目录
And:   创建 weight_records.jsonl（空文件）
And:   创建 user_config.json（含默认值）
And:   创建 health_tips.json（含默认提示）
And:   文件权限为 0o600
```

#### TC-INIT-02: 重复初始化不覆盖已有数据

```
Given: 数据目录已存在且包含用户数据
When:  调用 init()
Then:  保留已有 weight_records.jsonl 数据
And:   保留已有 user_config.json 配置
And:   不修改任何已有文件
```

---

### 模块: `scripts/record.js` — 体重记录

#### TC-REC-01: 记录有效体重

```
Given: 用户输入 "65.4"
When:  调用 record("65.4")
Then:  返回 { success: true, weight: 65.4 }
And:   weight_records.jsonl 新增一行记录
And:   记录包含 timestamp、weight、note 字段
```

#### TC-REC-02: 记录带备注的体重

```
Given: 用户输入 "65.4 空腹"
When:  调用 record("65.4 空腹")
Then:  返回 { success: true, weight: 65.4, note: "空腹" }
And:   记录中的 note 字段为 "空腹"
```

#### TC-REC-03: 拒绝无效输入

```
Given: 用户输入 "abc"
When:  调用 record("abc")
Then:  返回 { success: false, error: "INVALID_WEIGHT" }
And:   不写入任何数据
```

#### TC-REC-04: 拒绝负数体重

```
Given: 用户输入 "-5"
When:  调用 record("-5")
Then:  返回 { success: false, error: "INVALID_WEIGHT" }
```

#### TC-REC-05: 拒绝超出合理范围的体重

```
Given: 用户输入 "500"
When:  调用 record("500")
Then:  返回 { success: false, error: "OUT_OF_RANGE" }
```

---

### 模块: `scripts/query.js` — 体重查询

#### TC-QRY-01: 查询最近 7 天记录

```
Given: weight_records.jsonl 包含 30 天数据
When:  调用 query({ days: 7 })
Then:  返回最近 7 条记录
And:   按日期倒序排列
And:   包含 average、max、min 统计值
```

#### TC-QRY-02: 查询空数据

```
Given: weight_records.jsonl 为空
When:  调用 query({ days: 7 })
Then:  返回 { records: [], average: null, max: null, min: null }
```

#### TC-QRY-03: 查询天数超过总记录数

```
Given: weight_records.jsonl 只有 3 条记录
When:  调用 query({ days: 7 })
Then:  返回全部 3 条记录
```

---

### 模块: `scripts/report.js` — 报告生成

#### TC-RPT-01: 生成周趋势报告

```
Given: 4 周完整的体重数据（每天一条）
When:  调用 report({ type: 'trend', weeks: 4 })
Then:  返回 4 个周的平均体重
And:   每个周包含 weekNumber、average、change
And:   totalChange 计算正确
```

#### TC-RPT-02: 生成周报

```
Given: 本周有 5 天记录，上周有 7 天记录
When:  调用 report({ type: 'weekly' })
Then:  返回本周平均、上周平均、变化量
And:   返回最高/最低体重及对应日期
And:   返回记录天数占比
And:   返回目标进度（如已设置目标）
```

#### TC-RPT-03: 数据不足时的趋势报告

```
Given: 只有 5 天的数据
When:  调用 report({ type: 'trend', weeks: 4 })
Then:  返回可用数据的部分周统计
And:   不报错
```

---

### 模块: `scripts/reminder.js` — 提醒消息

#### TC-RMD-01: 早晨提醒（未记录时）

```
Given: 今日无体重记录
When:  调用 reminder({ type: 'morning' })
Then:  返回提醒消息对象
And:   消息包含 "该记录今天的体重"
```

#### TC-RMD-02: 早晨提醒（已记录时跳过）

```
Given: 今日已有体重记录
When:  调用 reminder({ type: 'morning' })
Then:  返回 null（表示跳过）
```

#### TC-RMD-03: 健康提醒随机选择

```
Given: health_tips.json 包含 10 条提示
When:  多次调用 reminder({ type: 'health' })
Then:  每次返回一条提示消息
And:   消息内容来自 health_tips.json
```

---

### 模块: `scripts/export.js` — 数据导出

#### TC-EXP-01: 导出为 CSV

```
Given: weight_records.jsonl 包含 10 条记录
When:  调用 export({ format: 'csv' })
Then:  生成 CSV 文件
And:   文件包含表头：date,time,weight,note
And:   包含全部 10 条数据
```

#### TC-EXP-02: 空数据导出

```
Given: weight_records.jsonl 为空
When:  调用 export({ format: 'csv' })
Then:  生成仅含表头的 CSV 文件
```

---

### 集成测试: 完整流程

#### TC-INT-01: 新用户首次使用流程

```
Given: 干净环境（无数据目录）
When:
  1. 调用 init()
  2. 设置目标体重 62.0
  3. 记录体重 65.4
  4. 查询最近 7 天
  5. 生成周报
Then:
  - 所有步骤成功执行
  - 数据文件正确写入
  - 周报显示正确的初始数据
```

#### TC-INT-02: 多天记录与趋势分析

```
Given: 已初始化环境
When:
  1. 连续 14 天每天记录体重（模拟递减趋势）
  2. 查询趋势（2 周）
Then:
  - 趋势显示体重下降
  - 总变化量计算正确
```

---

## 4. 测试数据

### 4.1 模拟体重记录（14 天递减趋势）

```jsonl
{"timestamp":"2026-04-13T07:15:00+08:00","weight":66.2,"note":""}
{"timestamp":"2026-04-14T07:10:00+08:00","weight":66.0,"note":""}
{"timestamp":"2026-04-15T07:20:00+08:00","weight":65.9,"note":"空腹"}
{"timestamp":"2026-04-16T07:15:00+08:00","weight":65.8,"note":""}
{"timestamp":"2026-04-17T07:12:00+08:00","weight":65.7,"note":""}
{"timestamp":"2026-04-18T07:18:00+08:00","weight":65.6,"note":""}
{"timestamp":"2026-04-19T07:14:00+08:00","weight":65.5,"note":""}
{"timestamp":"2026-04-20T07:16:00+08:00","weight":65.4,"note":"空腹"}
{"timestamp":"2026-04-21T07:11:00+08:00","weight":65.3,"note":""}
{"timestamp":"2026-04-22T07:13:00+08:00","weight":65.2,"note":""}
{"timestamp":"2026-04-23T07:19:00+08:00","weight":65.1,"note":""}
{"timestamp":"2026-04-24T07:15:00+08:00","weight":65.0,"note":""}
{"timestamp":"2026-04-25T07:17:00+08:00","weight":64.9,"note":"空腹"}
{"timestamp":"2026-04-26T07:14:00+08:00","weight":64.8,"note":""}
```

### 4.2 模拟配置

```json
{
  "target_weight": 62.0,
  "reminder_morning": "07:00",
  "weekly_review_day": "Sunday",
  "weekly_review_time": "20:00",
  "health_reminders": ["10:00", "15:00", "20:00"],
  "timezone": "Asia/Shanghai"
}
```

---

## 5. 测试命令

```bash
# 运行所有测试
npm test

# 运行单个测试文件
node --test tests/record.test.js

# 运行带详细输出
node --test --test-reporter=spec tests/

# 运行并生成覆盖率报告（需 Node.js >= 22）
node --test --experimental-test-coverage tests/
```

---

## 6. 持续集成

建议在 `.github/workflows/test.yml` 中配置：

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22.x, 24.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

---

## 7. 测试文件清单

```
tests/
├── init.test.js          # 初始化测试 (TC-INIT-*)
├── record.test.js        # 记录测试 (TC-REC-*)
├── query.test.js         # 查询测试 (TC-QRY-*)
├── report.test.js        # 报告测试 (TC-RPT-*)
├── reminder.test.js      # 提醒测试 (TC-RMD-*)
├── export.test.js        # 导出测试 (TC-EXP-*)
└── integration.test.js   # 集成测试 (TC-INT-*)
```
