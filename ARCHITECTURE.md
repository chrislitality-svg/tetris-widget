# ARCHITECTURE — tetris-widget

> 桌面悬浮式俄罗斯方块小程序（Electron + 原生 JS + Canvas）。
> 本文为 Phase 0 勘察产出，描述「现状」架构，不含改造方案。

## 技术栈

| 维度 | 现状 |
|------|------|
| 运行环境 | **Electron 28**（桌面应用，非纯 Web / 非终端） |
| 打包 | electron-builder → Windows **portable** 单 exe（`npm run build`） |
| 语言 | 原生 JavaScript，**无框架、无打包器、无 TypeScript** |
| 渲染 | HTML5 **Canvas 2D**（主画布 + next 预览画布） |
| 进程模型 | main（Node）/ preload（contextBridge）/ renderer（游戏），`contextIsolation: true`、`nodeIntegration: false` |
| 持久化 | `app.getPath('userData')/tetris-config.json` |
| 依赖 | 仅 devDependencies（electron、electron-builder）；运行时零三方依赖 |

## 文件地图（共 6 个源文件，约 1100 行游戏 + 809 行基准）

```
main.js              141 行  Electron 主进程
preload.js             7 行  IPC 桥（electronAPI）
icon.ico                     应用图标
benchmark_ai.js      809 行  独立无 UI 的 AI 基准测试（纯 Node，可直接 node 跑）
renderer/
  index.html          39 行  DOM 结构 + 顶部 6 按钮 + 两个 canvas
  style.css          143 行  悬浮窗样式 + -webkit-app-region 拖拽区
  tetris.js          816 行  全部游戏逻辑（核心）
```

## 各子系统在哪

### 1. 游戏主循环 / tick — `renderer/tetris.js`
- `tick()`（L274）：递归 `setTimeout` 驱动，**非 requestAnimationFrame**。每个 tick：AI 决策 → 下落一格 → 落地即 `lockPiece()` → `draw()` → 排下一次 tick。
- 节奏：`startLoop()`（L265）首拍用 `SPEEDS[speedKey].ms`；后续每拍 `SPEEDS[speedKey].ms - (level-1)*15`，下限 50ms（L297）。
- `dropCounter` 与 `dropCounter >= (aiMode!==0 ? 1 : 1)` 为遗留无效逻辑（恒为 1）。

### 2. 状态管理 — `renderer/tetris.js`（模块级全局变量 L82–99）
- 棋盘 `board`（二维数组，存颜色字符串或 null）、`currentPiece {type,rotation,row,col}`、`nextPiece`、`score/level/lines/highScore`、`gameOver/paused`、`aiMode(0/1/2)`、`speedKey/sizeKey`、`loopTimer/autoRestartTimer/dropCounter`。
- **无 hold、无 next 队列（只有 1 个 next）、无 7-bag、无回放、无种子。**

### 3. 渲染层 — `renderer/tetris.js`（L766–920）
- `draw()`：清屏 → `drawGrid` → 固定块 → `drawGhost`（幽灵落点）→ 当前块 → `drawOverlay`（暂停/结束）→ `drawNextPiece`。
- `drawCell` 含高光/阴影伪 3D。像素风（`imageSmoothingEnabled=false`、`image-rendering: pixelated`）。
- 全量重绘，无脏矩形；棋盘小，性能足够。

### 4. 输入层 — `renderer/tetris.js`
- `bindKeyboard()`（L173）：`keydown` 单一监听。← → / A D 移动，↓ / S 软降，↑ / W 旋转，空格硬降，P 暂停。
- `bindControls()`（L135）：顶部按钮 AI / 尺寸 / 速度 / 播放暂停 / 重开 / 关闭。
- **键位写死、不可重绑；无 DAS/ARR；移动连发依赖操作系统按键重复；未调用 `preventDefault()`。**

### 5. AI 模块 — `renderer/tetris.js`（L488–764）+ `benchmark_ai.js`
- 实时游戏：`aiMode=1` → `getBestAction1Step()`（贪心 1 步）；`aiMode=2` → `getBestAction2Step()`（含 next 的 2 步）。
- 评估 `evaluateBoard()`（L665）：聚合高度 / 空洞 / bumpiness / 最高列，权重写死。
- `executeAIAction()`（L744）只旋转+平移，**不主动硬降**，靠重力自然下落（每 tick 重算整盘）。
- `benchmark_ai.js`：独立 Node 脚本，含 `SeededRandom`、**7-bag `BagRandomizer`**（仅基准用，未进游戏）、`GameEngine`、7 种策略与 100 局批测。是 Phase 2 调参/对比的现成基础设施。

### 6. 配置 / 常量 — `renderer/tetris.js` 顶部（L1–72）
- `CELL_PX=20`、`CANVAS_SIZES`（small/medium/large）、`SPEEDS`（slow/normal/fast）、`PIECE_COLORS`、`SHAPES`（7 块各 4 旋转态）、`PIECE_TYPES`。

### 7. 窗口 / 桌面化 — `main.js`
- `BrowserWindow`：`frame:false`、`transparent:true`、`alwaysOnTop:true`、`skipTaskbar:true`、`resizable:false`。**已是无边框透明置顶悬浮窗** —— Phase 3 隐身功能的地基已在。
- 窗口位置持久化（`saveWindowBounds`/`ensureVisible` 防止移出屏幕）。
- IPC：`load-config` / `save-config` / `set-window-size` / `quit-app`。
- **未实现：透明度调节、鼠标穿透（setIgnoreMouseEvents）、托盘、全局热键（globalShortcut）、老板键、失焦自动暂停、自定义标题。**

## 数据流（一拍）

```
tick()
  ├─ aiMode≠0: getAIAction() → executeAIAction()  (旋转+平移)
  ├─ movePiece(1,0) 失败 → lockPiece()
  │     ├─ 写入 board
  │     ├─ clearLines() → 计分/升级/最高分
  │     └─ spawnPiece() → 碰撞则 endGame()
  ├─ draw() / updateUI()
  └─ setTimeout(tick, gravityMs)
```

## 关键观察（细节见 KNOWN_ISSUES.md / 规划）

- **手感三大缺口**：无 SRS 旋转/wall-kick、无 lock delay、无 DAS/ARR；piece 生成是纯随机非 7-bag。这些正是「灵魂手感」最该补的。
- **AI 偏弱**：基准实测 aiMode=1 ≈ 4 行/局、aiMode=2 ≈ 7 行/局即死；基准里"改进版" `CompleteHeuristic` 反而 0 行（权重 bug）。Phase 2 ROI 极高。
- **隐身地基已有**：透明 + 无边框 + 置顶 + 跳过任务栏；Phase 3 多为「在 main.js 增量加 IPC + globalShortcut + setIgnoreMouseEvents + Tray」。
- **代码整洁、零运行时依赖、易于增量改造**；改造主要集中在 `tetris.js` 与 `main.js`。

## 改造后结构变化（Phase 1–4）

> 上文是 Phase 0 的「现状」快照；Phase 1–4 完成后的新增/变化：

- 新增 `renderer/ai.js`：同构的共享 AI 引擎（El-Tetris 评估 + beam/hold + 难度档位），实机与 `benchmark_ai.js` 共用。
- 新增 `renderer/disguise.html`：老板键弹出的伪装 VS Code 编辑器（独立窗口）。
- 新增 `test/`（`core.test.js` + `ai.test.js`，node 纯逻辑单测）、`tools/`（`verify_visual.js` 截图/插桩验证、`verify_window.js` 窗口原语验证）。
- `renderer/tetris.js` 改为**固定步长循环**；棋盘单元格现存**方块类型字母**（draw 时按主题取色，支持即时换肤与脏行 `G`）；纯逻辑段可被 node `require` 单测。
- `main.js` 扩出窗口/隐身层（globalShortcut/Tray/setOpacity/setIgnoreMouseEvents/伪装窗口/边界夹取/配置白名单）。
- 配置持久化新增键：`settings`（含键位/手感/隐身/主题/静音）、`mode`、`records`（排行榜）、`achievements`。
```
