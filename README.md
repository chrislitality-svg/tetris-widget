# 俄罗斯方块桌面悬浮小程序（增强版）

一个 Electron 桌面悬浮俄罗斯方块小程序（无边框 / 透明 / 置顶），带启发式 AI 自动演示。
本仓库是在 `hamletzhang/tetris-widget` 基础上的增强 fork，目标是**手感不丢、AI 更聪明、能摸鱼、玩法更丰富**。fork 来源与许可见 [NOTICE.md](NOTICE.md)。

> 改造分 Phase 推进，**Phase 1（手感）、Phase 2（AI）、Phase 3（隐身/摸鱼）、Phase 4（趣味）已全部完成**。审计与进度见 [KNOWN_ISSUES.md](KNOWN_ISSUES.md) 与 [ARCHITECTURE.md](ARCHITECTURE.md)。

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

## 隐身 / 摸鱼（Phase 3）

点 ⚙ 打开**设置面板**（透明度、置顶、鼠标穿透、失焦自动暂停/隐藏、窗口标题、DAS/ARR/软降/锁定延迟、键位重绑、全局热键、导入/导出/恢复默认）。设置全部持久化。

- **老板键**：默认 `Ctrl+Alt+B`（全局，窗口不聚焦也生效）。一键隐藏游戏并弹出**伪装的 VS Code 编辑器**；再按一次恢复。关闭伪装窗口也会恢复。
- **鼠标穿透**：`Ctrl+Alt+T`。开启后鼠标点击穿过游戏窗口落到后面的工作窗口，游戏仍接收键盘。
- **显示/隐藏**：`Ctrl+Alt+H`。**Mini 模式**：`Ctrl+Alt+M`（缩成只剩棋盘的小窗）。
- **系统托盘**：右键菜单可显示/隐藏、老板键、鼠标穿透、Mini、退出；左键点击切换显示。
- **透明度**滑杆（最低 10%，超隐身）、**窗口置顶**开关、**失焦自动暂停 / 自动隐藏**、**自定义窗口标题**（伪装）。
- **全键位自定义** + 暴露 **DAS/ARR**；全局热键可改（Electron accelerator 写法，如 `Control+Alt+B`）。

> 全局热键是系统级的：注册后会在全系统拦截该组合键。默认用不常见的 `Ctrl+Alt+*` 组合，可在设置里改。

默认全局热键：

| 功能 | 默认热键 |
|------|---------|
| 老板键（隐藏 + 伪装） | `Ctrl+Alt+B` |
| 显示 / 隐藏 | `Ctrl+Alt+H` |
| 鼠标穿透 | `Ctrl+Alt+T` |
| Mini 模式 | `Ctrl+Alt+M` |

## 玩法 / 趣味（Phase 4）

- **游戏模式**（设置面板「游戏模式」切换）：马拉松、Sprint40（消 40 行计时）、Ultra（2 分钟刷分）、Zen（不会结束）、Cheese（清脏行求生）、每日挑战（按日期种子，每天同一套方块顺序）。
- **本地排行榜**：各模式独立记录最佳（分数 / 时间 / 行数），持久化，显示在信息栏「最佳」。
- **主题**：经典 / 极简 / 霓虹 / 马卡龙 四套配色，即时切换（连已落方块一起换色）；可经设置导入/导出自定义配色。
- **手感反馈（juice）**：消行震屏 + 闪光 + 粒子、升级闪光、消行类型提示（SINGLE/TETRIS/T-SPIN/B2B/COMBO）。克制，不糊脸。
- **音效**：WebAudio 合成（无版权素材），**默认静音**，设置里开。
- **成就**：8 个（首次 Tetris / T-Spin、5 连击、10 级、百行、Sprint 破 60 秒、完成 Ultra、3 连难度消除），解锁有提示并持久化，设置面板可查看。

> 联机对战 / 在线排行按需求不做；分屏 vs-AI 与回放录制按 ROI 推迟（见 KNOWN_ISSUES）。

## 构建与运行

```bash
npm install        # 安装依赖（Electron）
npm start          # 开发运行
npm run build      # 打包 → 单文件便携版 release/俄罗斯方块-1.0.0.exe
npm test           # 引擎单元测试（node 纯逻辑，43 条断言）
npm run bench      # AI 策略基准对比
npm run verify     # 离屏加载真实渲染器并截图验证（产出 verify_shots/）
```

- 产物 **`release/俄罗斯方块-1.0.0.exe` 是单文件便携版**，双击即玩、免安装、无需 Node/npm。
- `npm run build` 分两步（已串好）：先用 `@electron/packager` 产出未打包应用（`npm run pack`，不触发 winCodeSign），再用 electron-builder `--prepackaged` 包成单文件便携版、并跳过签名（`CSC_IDENTITY_AUTO_DISCOVERY=false`）。这样在「无管理员 / 未开开发者模式」的 Windows 上也能一键构建——绕开 electron-builder 解压 winCodeSign 内 macOS 符号链接时的权限报错（`客户端没有所需的特权`）。
- 要求 Node ≥ 18。主攻平台：Windows。

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
