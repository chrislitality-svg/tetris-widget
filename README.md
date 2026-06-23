# 俄罗斯方块桌面悬浮小程序（增强版）

一个 Electron 桌面悬浮俄罗斯方块小程序（无边框 / 透明 / 置顶），带启发式 AI 自动演示。
本仓库是在 `hamletzhang/tetris-widget` 基础上的增强 fork，目标是**手感不丢、AI 更聪明、能摸鱼、玩法更丰富**。fork 来源与许可见 [NOTICE.md](NOTICE.md)。

> 改造分 Phase 推进。**Phase 1（手感与 Bug）、Phase 2（AI 强化）已完成**；Phase 3（隐身/摸鱼）、Phase 4（趣味）规划见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md) 与 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 已实现（Phase 1）

- **真·SRS 旋转 + 官方踢墙表**（JLSTZ / I 两套 kick 表）：贴墙、贴地、贴块都能踢墙旋转，T-spin 可做。
- **Lock delay**（落地 0.5s 宽限，移动/旋转可重置，封顶 15 次防 infinity）：能滑移、贴入、最后一刻旋转。
- **DAS / ARR** 横移手感模型（不再受操作系统按键重复摆布，且可调）。
- **7-bag 随机器**：每 7 个方块各出一次，无长龙长旱。
- **Hold 暂存**：每块一次，UI 暂存框（不可用时变暗）。
- **现代计分**：软降 +1/格、硬降 +2/格、消行 × 等级、Combo、Back-to-Back ×1.5、**T-spin** 识别与计分（消行类型有画面提示）。
- **Ghost 落点**、失焦自动暂停（手动模式）、AI 模式锁手动键、暂停即重绘、致死方块高亮显示等一系列手感/边界修复。

详细「问题 → 根因 → 修复 → 验证」清单见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)。

## 默认操作

| 操作 | 按键 |
|------|------|
| 左移 / 右移 | ← → 或 A / D |
| 软降 | ↓ 或 S |
| 顺时针旋转 | ↑ / W / X |
| 逆时针旋转 | Z / Ctrl |
| 硬降 | 空格 |
| 暂存 (Hold) | C / Shift |
| 暂停 / 继续 | P / Esc |

顶部按钮：`AI`（手动 → AI → AI+ 循环）、`⊡` 切换棋盘尺寸、`⚡` 切换基础速度、`▶/⏸` 开始暂停、`↻` 重开、`×` 退出。
窗口可拖动（拖容器空白处），位置自动记忆。

### 手感参数（持久化，默认值）

| 参数 | 默认 | 说明 |
|------|------|------|
| DAS | 130ms | 长按横移的初始延迟 |
| ARR | 20ms | 自动横移重复间隔（0 = 直接顶到墙） |
| 软降速度 | 25ms/格 | |
| Lock delay | 500ms | 落地锁定宽限 |
| Lock 重置上限 | 15 | 移动/旋转重置锁定的次数上限 |
| 失焦自动暂停 | 开（仅手动模式） | AI 演示不受影响 |

> 目前通过配置文件持久化；可视化的键位/手感设置面板计划在 Phase 3 提供。

## AI（Phase 2 · 已强化）

点击 `AI` 按钮在 **手动 → 弱 → 普通 → 变态** 间循环（按钮显示 弱/普/变，悬停有全名）：

- **弱鸡**：近视权重 + 高失误率，可被人类击败（适合当对手）。
- **普通**：El-Tetris 评估，1 步。
- **变态**：El-Tetris 评估 + 含 next 前瞻 + 自动 hold（基准里近乎不死）。

评估特征参考 El-Tetris / Dellacherie：landing height、消行数、行/列 transitions、空洞数、井深。
实机与基准**共用同一套引擎**（`renderer/ai.js`），所以基准数据对实机有代表性。
AI 模式下游戏结束 5 秒后自动重开（适合当桌面演示）。按 **G** 切换 **AI 决策可视化**（高亮 AI 选定的落点 + 难度/空洞/评分）。

基准（`npm run bench` 或 `node benchmark_ai.js`，10×20 / 7-bag）：

| 策略 | 平均消行 | 触顶(≈不死) |
|------|---------|-------------|
| 旧版 shipped 1-step | 106 | 0/20 |
| El-Tetris 普通 (1-ply) | 562 | 7/20 |
| El-Tetris 变态 (2-ply+hold) | 799 | 8/8 |

## 构建与运行

```bash
npm install        # 安装依赖（Electron）
npm start          # 开发运行
npm run build      # 打包 Windows portable 单 exe（输出 release/）
npm test           # 运行引擎单元测试（node，纯逻辑，30 条断言）
npm run verify     # 离屏加载真实渲染器、脚本化驱动并截图（产出 verify_shots/）
```

要求 Node ≥ 18。主攻平台：Windows。

## 项目结构

```
main.js              Electron 主进程（窗口 / IPC / 配置持久化）
preload.js           contextBridge（electronAPI）
renderer/
  index.html         DOM：棋盘 + Hold/Next 预览 + 信息面板 + 顶部按钮
  style.css          悬浮窗样式
  tetris.js          全部游戏逻辑（同构：纯逻辑可被 node require 做单测）
benchmark_ai.js      无 UI 的 AI 策略基准台
test/core.test.js    引擎纯逻辑单元测试
tools/verify_visual.js  Electron 截图/断言验证脚本
ARCHITECTURE.md      架构说明
KNOWN_ISSUES.md      问题审计与修复进度
NOTICE.md            fork 来源与许可说明
```
