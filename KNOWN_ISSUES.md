# KNOWN_ISSUES — tetris-widget

> Phase 0 系统性审计产出。方法：7 路并行 finder 按维度排查 → 每条候选交独立 verifier「对着源码反向求证」（默认证伪）。
> 结果：**60 条候选 → 53 条确认、7 条驳回**。下表按「修复所属 Phase」分组，严重度 = verifier 校正后的等级。
> 行号基于审计时的 `renderer/tetris.js`（816 行）/ `main.js`。修复时以实际代码为准。

## 严重度概览

| 等级 | 数量 | 说明 |
|------|------|------|
| 🔴 high | 1 | 无 lock delay（手感头号问题） |
| 🟠 medium | 20 | 手感缺口（SRS/7-bag/DAS-ARR/hold）、计分缺失、AI 偏弱与 bug、老板键/穿透缺失等 |
| 🟡 low | 32 | 打磨项、边界、隐身/趣味功能缺口、代码清理 |

---

## Phase 1 — 手感与 Bug（最高优先：恢复「Tetris 的灵魂」）

### 🔴/🟠 旋转系统（无 SRS / 无 wall-kick）—— 4 条，一次重构统一修复
| id | 级别 | 位置 | essence |
|----|------|------|---------|
| `no-wall-kick-system` | 🟠 | tetris.js:376-382 `rotatePiece` | 旋转只做一次原地 collides 测试，撞墙/贴地/贴块即**静默失败**，无任何踢墙回退 |
| `edge-rotation-silent-fail` | 🟠 | :376-382 + collides :350-363 | 竖 I 贴右墙旋转→横态越界→静默吞掉按键（实测 col=7 必失败） |
| `non-srs-rotation-offsets` | 🟠 | SHAPES :27-70 | 四个旋转帧是手绘 bitmap，无统一 SRS 轴心，空中连转会「走位」 |
| `t-spin-impossible` | 🟠 | :376-382 | 无踢墙 ⇒ 所有 spin tuck / T-spin 物理上不可能；也无 lastMove 标记 |
> **修复**：用 SRS 标准旋转帧 + JLSTZ/I 官方 kick 表替换 SHAPES & rotatePiece；记录 `lastMoveWasRotation`/`usedKick` 为 T-spin 检测铺路。这一项一次性消掉 4 条，是恢复手感的第一杠杆。

### 🔴 Lock delay / tick 循环 —— 6 条
| id | 级别 | 位置 | essence |
|----|------|------|---------|
| `no-lock-delay-instant-lock` | 🔴 | tick :286-289 / lockPiece :399-426 | **落地当拍即锁**，无 0.5s 宽限，无法滑移/贴入/最后一刻旋转。手感头号偏差 |
| `softdrop-locks-on-contact` | 🟠 | softDrop :384-389 | 软降触底立即锁定，行为像「半个硬降」 |
| `level-gravity-formula-weak` | 🟡 | :270 vs :297-298 | 线性 `-15ms/级` + 50ms 硬底，fast 档 ~lv8 即封顶 |
| `dropcounter-dead-code` | 🟡 | :285 | 门 `dropCounter >= (aiMode!==0?1:1)` 恒真，累加器是死代码 |
| `pause-leaves-pending-gravity-timer` | 🟡 | togglePause :258-260 | 暂停未 clearTimeout，残留一次空 tick 唤醒 |
| `applyspeed-no-reschedule` | 🟡 | applySpeed :216-219 | 切速度不立即重排定时器，慢一拍生效 |
> **修复**：引入 grounded 状态 + lockDelay 累加器（~500ms，move/rotate 可重置但**封顶 ~15 次**防 infinity），硬降仍即时锁。顺手抽出 `gravityMs()` 统一 startLoop/tick，并清理 dropCounter / 暂停定时器 / 切速度重排。

### 🟠 计分 —— 7 条
| id | 级别 | 位置 | essence |
|----|------|------|---------|
| `no-soft-hard-drop-scoring` | 🟠 | softDrop/hardDrop | 软降/硬降**零得分**（标准：软 +1/格、硬 +2/格） |
| `line-clear-score-ignores-level` | 🟠 | :442-443 | 消行得分不乘等级，lv1 与 lv5 消一行都 +100 |
| `no-combo-scoring` | 🟡 | clearLines | 无 combo 计数/奖励 |
| `no-back-to-back-scoring` | 🟡 | :442-443 | 连续 Tetris/T-spin 无 B2B ×1.5 |
| `no-tspin-detection` | 🟡 | rotatePiece/clearLines | 无 T-spin 识别与计分（依赖先做 SRS+lastMove） |
| `first-tick-ignores-level-gravity` | 🟡 | :270 vs :297 | 高等级暂停后首拍用基础速度（与 level-gravity 同根，gravityMs() 一并修） |
| `gravity-curve-tied-to-speed-base-and-linear` | 🟡 | :297-298 | 重力曲线粗糙、与速度档耦合（打磨项） |
> **修复**：软/硬降按格计分；消行 `points[n] * level`；加 combo（`50*combo*level`）与 B2B（×1.5）；T-spin 计分待 SRS 后补。

### 🟠 随机器 / 出生 / 顶出 —— 5 条
| id | 级别 | 位置 | essence |
|----|------|------|---------|
| `no-7bag-pure-random` | 🟠 | randomPiece :338-343 | 实机用纯 `Math.random`，会长龙/长旱；**benchmark 已有正确的 7-bag 却没移植进游戏** |
| `topout-block-out-only-no-lock-out` | 🟡 | spawn :333-335 | 仅 spawn 重叠才判负（block-out），无 lock-out，顶出延迟 ~1 块 |
| `gameover-piece-not-rendered` | 🟡 | draw :788/793 | 致死块因 `!gameOver` 门控不被绘制，看不到「死在哪」 |
| `nextpiece-rotation-field-unused` | 🟡 | :320-329 | randomPiece 返回的 rotation 字段是死状态 |
| `no-vanish-buffer-zone` | 🟡 | board 高度 | 无缓冲行，I 比其它块低一行出生，零出生头顶空间 |
> **修复**：把 `BagRandomizer` 从 benchmark 移植到 renderer（resetGame 重置 bag）；加 lock-out 判定 + 致死块渲染（可红色）；可选加缓冲行。

### 🟠 输入 / DAS-ARR / 焦点 —— 7 条
| id | 级别 | 位置 | essence |
|----|------|------|---------|
| `no-das-arr` | 🟠 | bindKeyboard :173 | 横移完全靠**操作系统按键重复**，无 DAS/ARR，手感不可控 |
| `no-preventdefault` | 🟠 | bindKeyboard | 未 `preventDefault`，空格/方向键会滚动页面、并**重新触发上次聚焦的按钮** |
| `no-autopause-on-blur` | 🟠 | （缺失） | 窗口失焦/最小化仍在跑（与 Phase 3 隐身重叠） |
| `softdrop-hold-instant-lock` | 🟡 | softDrop | 长按软降立即锁（与 lock delay 同根） |
| `manual-input-active-during-ai` | 🟡 | bindKeyboard | AI 模式下手动键仍生效，玩家会和 AI「打架」 |
| `toggle-pause-p-no-redraw` | 🟡 | togglePause | 按 P 暂停后到下一拍才画暂停遮罩 |
| `keyboard-on-document-not-canvas` | 🟡 | :174 | 键盘挂在 document 而非可聚焦 canvas，无输入隔离 |
> **修复**：建 held-keys 状态机 + 可调 DAS(~150ms)/ARR(~30ms)；全局 `preventDefault` 并在点击后 blur 按钮；AI 模式锁手动键；暂停即重绘。失焦自动暂停在 Phase 3 完整做。

### 🟠 Hold（核心手感功能，当前完全缺失）
| id | 级别 | 位置 | essence |
|----|------|------|---------|
| `no-hold-piece` | 🟠 | （缺失） | 无 hold 暂存机制（现代 Tetris 核心）。需加 hold 状态 + 每块一次限制 + UI 暂存框 |

---

## Phase 2 — AI（基准实测极弱，ROI 最高）

> **基准数据**（10×20，每策略 100 局）：实机 aiMode=1 ≈ **4 行/局**、aiMode=2 ≈ **7 行/局** 即死；基准里「改进版」CompleteHeuristic 反而 **0 行**。
> 良好的 Dellacherie/El-Tetris 启发式应能存活**数百~数千行**。目标：实机 AI 进入这个量级。

| id | 级别 | 位置 | essence |
|----|------|------|---------|
| `completeheuristic-builds-wells-0-lines` | 🟠 | benchmark_ai.js `strategyCompleteHeuristic` | wells 奖励 +50/井 诱导 AI 挖深井 ⇒ 0 行、最快死 |
| `benchmark-median-undefined` | 🟠 | runBenchmark 打印 | 汇总表中位数列用 `r.median`（应为 `r.pieces.median`）→ 打印 `undefined` |
| `getbestaction2step-never-values-lineclears` | 🟠 | getBestAction2Step :585 | 2 步前瞻里 `countLinesCleared(已消行的盘)` 恒 0，消行从不被纳入下一步价值 |
| `live-ai-reruns-every-tick-waits-gravity` | 🟠 | tick/executeAIAction | 每 tick 重算全盘搜索 + 不主动硬降靠重力 ⇒ 慢且抖 |
| `executeaiaction-misplace-obstructed-path` | 🟠 | executeAIAction :744 | 出生行横移遇阻 `break`，导致落点偏离最优 |
| `live-evaluateboard-no-lineclear-term` | 🟡 | evaluateBoard :665 | 实机评估函数无消行项、空洞权重弱于基准最优策略 |
| `dead-code-enumerateplacements` | 🟡 | benchmark_ai.js | `enumeratePlacements()` 从未被调用、`baseScoreOnly` 从未被读 |
> 另注（来自驳回项校验）：`simulatePlacement`(:617-622) 消行循环缺 `r++`，AI 评估盘可能漏消一行——属 AI 评估瑕疵，非计分 bug。
> **修复**：先修上述 bug；再实现标准 **El-Tetris/Dellacherie** 评估（landing height / rows cleared / row+col transitions / holes / wells / hole depth）+ 已知好权重，用现成 benchmark 验证；加 **beam search**（含 next+hold 前瞻）；**难度档位**（弱/普通/变态，靠搜索深度+权重+故意失误率）；**AI 决策可视化/debug 开关**。

---

## Phase 3 — 隐身 / 摸鱼（核心卖点；Windows + Electron，几何地基已具备）

| id | 级别 | essence / 方案 |
|----|------|----------------|
| `no-boss-key` | 🟠 | **老板键**：全局热键秒隐 / 切伪装窗。优先级最高 |
| `no-click-through` | 🟠 | **鼠标穿透**：`win.setIgnoreMouseEvents({forward:true})`，游戏仍收键盘 |
| `no-adjustable-opacity` | 🟡 | 透明度滑杆 `win.setOpacity()`，含极低「隐身」档 |
| `no-system-tray` | 🟡 | 托盘图标 + 菜单（隐藏/显示/退出/老板键） |
| `no-mini-mode` | 🟡 | mini 模式：缩到屏角悬浮，置顶可切 |
| `no-global-hotkeys` | 🟡 | `globalShortcut` 注册移动/旋转/hold/降/老板键，失焦可用 |
| `no-focus-blur-autopause` | 🟡 | 失焦自动暂停/自动隐藏（可开关） |
| `no-key-rebinding` | 🟡 | 全键位自定义 + 暴露 DAS/ARR |
| `no-custom-window-title` | 🟡 | 伪装用自定义窗口标题 |
| `size-change-pushes-offscreen` | 🟠 | setBounds 只改宽高不夹取，大尺寸会把窗推出屏幕 |
| `offscreen-bounds-persisted-unclamped` | 🟡 | 越界 bounds 被原样持久化，仅下次启动才懒夹取 |
| `bounds-save-no-resize-hook` | 🟡 | 只 hook `moved` 没 hook `resize`，尺寸持久化全靠渲染端 IPC |
| `save-config-blind-objectassign` | 🟡 | `save-config` 把渲染端任意 payload 直接 `Object.assign` 进配置（应白名单校验） |
| `devtools-enabled-in-prod` | 🟡 | 打包版仍 `devTools:true`，与隐身姿态相悖（用 `!app.isPackaged`） |
> **方案**：以上多为在 `main.js` 增量加 IPC + `globalShortcut` + `setIgnoreMouseEvents` + `Tray` + 一个伪装窗口；统一**设置面板** + 全量持久化 + 导入导出。窗口边界相关 4 条一并夹取/校验。

---

## Phase 4 — 趣味与增长

| id | 级别 | essence |
|----|------|---------|
| `no-theme-system` | 🟡 | 颜色写死，无主题/自定义配色系统 |
| `no-replay` | 🟡 | 无回放录制/播放（需种子化 RNG + 记录输入） |
> 另规划（非 bug，属新功能）：游戏模式（Marathon/Sprint 40L/Ultra/Cheese/Zen/对战 AI/每日挑战）、juice（消行/T-spin/B2B/combo 动效+轻震屏+粒子+音效，克制）、本地排行榜、成就、设置/存档导入导出。音频只用开源/自制资源。

---

## 已驳回（7 条，verifier 证伪 / 非真实缺陷）—— 记录在案避免重复排查

| id | 结论 |
|----|------|
| `restart-while-running-double-loop-race` | **证伪**：startLoop() 进入即 clearTimeout，重开/改尺寸不会叠加定时器 |
| `p-toggle-during-gameover-restarts` | **证伪**：keydown 首行 `if(gameOver)return`(:175) 在 P 处理(:177)之前，P 在游戏结束时不会触发重开 |
| `clearlines-splice-loop-correct` | **核实为正确**：splice+unshift+`r++` 重查当前行，无漏消/重复计数（benchmark 同写法） |
| `no-infinity-lock-risk-but-watch-on-fix` | 当前无 lock delay ⇒ 无 infinity 风险；属「做 lock delay 时需加 move-reset 上限」的提醒，非现存缺陷 |
| `pause-overlay-not-drawn-after-blur-resume` | 与 `no-das-arr` 重复；无独立缺陷（暂停键在移动分发前 return，无「spam」） |
| `no-mute-sound` | 当前根本无音频系统，mute 是「加了音频之后」的事，非现存缺陷 |
| `no-game-modes` | 单一无尽模式本身是完整功能；多模式是功能请求，非缺陷（已纳入 Phase 4 规划） |
