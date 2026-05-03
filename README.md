# 🏋️ Health Weight Manager

一个运行在 [OpenClaw](https://openclaw.ai) 上的体重管理与健康提醒 Skill。

---

## ✨ 功能特性

- **🌅 早晨称重提醒** — 每天定时提醒记录体重，支持直接回复数字快速记录
- **📊 每周体重回顾** — 自动生成周报，包含平均值、变化趋势、目标进度
- **💡 每日健康提醒** — 分时段发送健康小贴士，助你养成好习惯
- **📈 趋势分析** — 查看体重变化趋势，支持周/月维度分析
- **🎯 目标管理** — 设置目标体重，实时跟踪完成进度
- **📤 数据导出** — 一键导出 CSV，方便在 Excel/Numbers 中分析

---

## 📦 安装

### 方法 1: 手动安装

```bash
# 1. 进入 OpenClaw workspace skills 目录
cd ~/.openclaw/workspace/skills

# 2. 克隆或复制本 Skill
mkdir -p health-weight-manager
cp -r /path/to/health-weight-manager/* health-weight-manager/

# 3. 初始化数据目录
cd health-weight-manager
node scripts/init.js

# 4. 重启 OpenClaw Gateway 或等待 Skill 热重载
openclaw gateway restart
```

### 方法 2: 通过 ClawHub 安装（发布后）

```bash
clawhub install health-weight-manager
```

---

## ⚙️ 配置

编辑 `data/user_config.json` 来自定义提醒时间：

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

配置项说明：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `target_weight` | number | `null` | 目标体重（kg） |
| `reminder_morning` | string | `"07:00"` | 早晨称重提醒时间 |
| `weekly_review_day` | string | `"Sunday"` | 周报发送日（英文星期） |
| `weekly_review_time` | string | `"20:00"` | 周报发送时间 |
| `health_reminders` | string[] | `["10:00", "15:00", "20:00"]` | 健康提醒时间点列表 |
| `timezone` | string | `"Asia/Shanghai"` | 时区 |

> 修改配置后需重启 Gateway 以使 cron 任务重新调度。

---

## 🚀 使用方式

### 记录体重

在任意已连接的渠道（Telegram/Slack/WhatsApp 等）中发送：

```
记录体重 65.4
```

或直接回复早晨提醒消息：

```
65.4
```

支持带备注：

```
记录体重 65.4 空腹
```

### 查看记录

```
查看体重
查看体重 14       # 查看最近 14 天
体重记录 30       # 查看最近 30 天
```

### 趋势分析

```
体重趋势
趋势 8            # 查看最近 8 周趋势
```

### 设置目标

```
设置目标 62.0
目标体重 60
```

### 导出数据

```
导出数据
```

---

## 📁 数据存储

所有数据存储在本地，路径为：

```
~/.openclaw/workspace/skills/health-weight-manager/data/
├── weight_records.jsonl   # 体重记录
├── user_config.json       # 用户配置
└── health_tips.json       # 健康小贴士
```

数据文件权限为 `600`，确保只有你能访问。

---

## 🔔 提醒时间线

```
07:00  🌅 早晨称重提醒
       "早上好！该记录今天的体重啦～"

10:00  💧 健康提醒 #1
       "记得每小时喝一杯水，促进新陈代谢！"

15:00  🚶 健康提醒 #2
       "久坐后起来走动 5 分钟，活动一下筋骨。"

20:00  🥗 健康提醒 #3
       "晚餐尽量清淡，控制碳水摄入有助于体重管理。"

周日 20:00  📊 每周体重回顾
       "本周平均 65.2kg，比上周减少 0.6kg，继续加油！"
```

---

## 🛠️ 开发

### 目录结构

```
health-weight-manager/
├── SKILL.md              # Skill 定义（Prompt + 元数据）
├── README.md             # 本文件
├── config.json           # 默认配置
├── package.json          # Node.js 依赖
├── scripts/              # 业务逻辑脚本
│   ├── init.js           # 初始化
│   ├── record.js         # 记录体重
│   ├── query.js          # 查询记录
│   ├── report.js         # 生成周报
│   ├── reminder.js       # 提醒消息组装
│   └── export.js         # 数据导出
├── tests/                # 测试用例
└── docs/
    └── DESIGN.md         # 设计文档
```

### 运行测试

```bash
cd ~/.openclaw/workspace/skills/health-weight-manager
npm test
```

---

## 📄 License

MIT

---

## 🤝 贡献

欢迎通过 Issue 或 PR 提交改进建议。你可以：

- 添加更多健康小贴士
- 改进周报的可视化效果
- 支持更多导出格式（JSON、PDF 等）
- 添加多语言支持
