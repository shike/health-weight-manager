# Health Weight Manager — Hermes Agent 兼容性分析报告

> **分析日期**: 2026-05-03  
> **Hermes Agent 版本参考**: v0.11+  
> **Agent Skills 标准**: agentskills.io/specification

---

## 1. 总体结论

本项目**可以适配到 Hermes Agent** 中运行，但需要进行以下调整：

1. **SKILL.md 格式转换**：从 OpenClaw 格式转为 agentskills.io 开放标准格式
2. **工具声明更新**：将 OpenClaw 工具名映射为 Hermes 工具集
3. **Cron 注册方式变更**：从 OpenClaw 内置 cron 改为 Hermes `cronjob` 工具集管理
4. **数据目录路径确认**：依赖相对路径 `../data`，在 Hermes 中需确认安装位置

---

## 2. 平台差异对照表

| 维度 | OpenClaw | Hermes Agent | 影响 |
|------|----------|-------------|------|
| **Skill 目录** | `~/.openclaw/workspace/skills/` | `~/.hermes/skills/<category>/<name>/` | 需调整安装路径 |
| **SKILL.md 标准** | OpenClaw 自定义 frontmatter | agentskills.io 开放标准 + Hermes 扩展 | 需重写 frontmatter |
| **Cron 调度** | 内置 `cron` 工具 | `cronjob` 工具集 | 工具名和 API 不同 |
| **消息发送** | `message` 工具 | 直接回复 / `send_message` / Gateway | CLI 场景无需额外工具 |
| **文件读写** | `read` / `write` | `file` 工具集 (`read_file` / `write_file`) | 功能等价 |
| **脚本执行** | `bash` 工具 | `terminal` 工具集 | 功能等价 |
| **数据目录** | `~/.openclaw/.../data/` | 相对路径 `../data` | 代码已兼容相对路径 |
| **Node.js 依赖** | `metadata.openclaw.requires.bins` | `compatibility` 字段声明 | 需在文档中说明 |

---

## 3. 代码层面兼容性评估

### ✅ 无需修改的部分

| 组件 | 原因 |
|------|------|
| `scripts/*.js` 全部业务逻辑 | 纯 Node.js 代码，通过 `terminal` 工具执行即可 |
| `scripts/utils.js` | 通用工具函数，无平台依赖 |
| `tests/*.test.js` | 测试通过 `npm test` 运行，与 Agent 平台无关 |
| `data/` 数据目录结构 | JSONL + JSON 格式，平台无关 |
| `package.json` | 标准 Node.js 项目配置 |

### ⚠️ 需要修改的部分

| 组件 | 修改内容 | 工作量 |
|------|----------|--------|
| `SKILL.md` | 重写 frontmatter 为 agentskills.io 格式 | 中等 |
| `docs/` | 更新安装说明中的路径和命令 | 小 |
| Cron 注册逻辑 | SKILL 内容中指导 Hermes 使用 `cronjob` 工具 | 小 |

---

## 4. Hermes Agent 前置配置清单

以下配置必须由 **Hermes Agent 或其用户** 在加载本 Skill 之前完成：

### 4.1 系统依赖（必须）

| 依赖 | 版本 | 检查命令 | 说明 |
|------|------|----------|------|
| Node.js | >= 18.0.0 | `node --version` | 执行所有业务脚本 |
| npm | >= 8.0.0 | `npm --version` | 运行测试（可选） |

> 建议在 `SKILL.md` 的 `compatibility` 字段声明此要求。

### 4.2 Hermes 工具集启用（必须）

本 Skill 需要以下 Hermes 工具集：

```bash
hermes tools enable file      # 读写数据文件
hermes tools enable terminal  # 执行 node scripts/*.js
hermes tools enable cronjob   # 定时提醒任务
```

若需通过 Gateway（Telegram/Slack/WhatsApp）发送消息，额外需要：

```bash
hermes tools enable messaging
```

### 4.3 Skill 安装（必须）

```bash
# 方法 1：直接复制到 Hermes skills 目录
mkdir -p ~/.hermes/skills/health/health-weight-manager
cp -r /path/to/health-weight-manager/* ~/.hermes/skills/health/health-weight-manager/

# 方法 2：作为外部 Skill 目录引用（推荐开发时用）
# 在 ~/.hermes/config.yaml 中添加：
# skills:
#   external_dirs:
#     - /path/to/health-weight-manager
```

### 4.4 数据初始化（必须）

```bash
cd ~/.hermes/skills/health/health-weight-manager
node scripts/init.js
```

### 4.5 Cron 任务注册（必须，否则定时提醒不工作）

Hermes 的 `cronjob` 工具用于管理定时任务。首次激活 Skill 时，应提示用户/hermes 注册以下 cron jobs：

| Cron 表达式 | 任务描述 | 对应脚本 |
|------------|----------|----------|
| `0 7 * * *` | 早晨称重提醒 | `node scripts/reminder.js morning` |
| `0 10 * * *` | 上午健康提醒 | `node scripts/reminder.js health` |
| `0 15 * * *` | 下午健康提醒 | `node scripts/reminder.js health` |
| `0 20 * * *` | 晚间健康提醒 | `node scripts/reminder.js health` |
| `0 20 * * 0` | 每周体重回顾 | `node scripts/report.js weekly` |

> **注意**：Hermes 的 cron 任务可以通过 `cronjob` 工具动态创建，也可以在 `~/.hermes/cron/` 中配置。Skill 本身无法自注册 cron，需要在 `SKILL.md` 中明确指导 Hermes 完成此步骤。

### 4.6 用户个性化配置（可选）

编辑 `~/.hermes/skills/health/health-weight-manager/data/user_config.json`：

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

## 5. Hermes 加载流程预测

当 Hermes Agent 加载本 Skill 时，预期行为如下：

```
1. 用户输入触发词（"记录体重", "体重趋势" 等）
   ↓
2. Hermes 的 skill router 匹配到 health-weight-manager
   ↓
3. Level 0：加载 frontmatter 元数据（~3k tokens）
   ↓
4. Level 1：加载完整 SKILL.md 内容
   ↓
5. Skill 指示 Hermes 执行 node scripts/xxx.js
   ↓
6. Hermes 使用 terminal 工具执行 Node.js 脚本
   ↓
7. 脚本读取/写入 ~/.hermes/skills/.../data/ 下的文件
   ↓
8. Hermes 将脚本输出（JSON）格式化为中文回复
```

---

## 6. 风险评估

| 风险 | 等级 | 说明 | 缓解措施 |
|------|------|------|----------|
| Node.js 未安装 | 🔴 高 | 所有脚本无法执行 | 在 `compatibility` 中明确声明；首次加载时检查 |
| Cron 未配置 | 🟡 中 | 定时提醒功能失效 | SKILL.md 中必须包含 cron 设置指导 |
| 数据目录权限 | 🟡 中 | `0o600` 文件权限在部分系统上受限 | 已在代码中处理 Windows 跳过逻辑 |
| 时区配置错误 | 🟢 低 | 提醒可能在不同时区触发错误 | 使用 `Intl.DateTimeFormat` 已较健壮 |
| Hermes 缓存 | 🟢 低 | Skill 文件修改后需 `/reset` 才能生效 | 在文档中提示用户 |

---

## 7. 建议的适配步骤

1. **重写 `SKILL.md`** 为 agentskills.io 格式（已提供 `SKILL.md` 更新版本）
2. **验证测试**在 Hermes 环境中通过：`npm test`
3. **手动测试核心流程**：
   - `node scripts/init.js`
   - `node scripts/record.js 65.4`
   - `node scripts/query.js 7`
   - `node scripts/report.js weekly`
4. **配置 cronjob**：使用 `hermes cron` 或 `cronjob` 工具注册 5 个定时任务
5. **测试 Gateway 消息投递**（如使用 Telegram/Slack）

---

## 8. 参考链接

- [Agent Skills Specification](https://agentskills.io/specification)
- [Hermes Agent Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [Hermes Agent Tools & Toolsets](https://hermes-agent.nousresearch.com/docs/user-guide/features/tools)
- [Hermes Agent Cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)
