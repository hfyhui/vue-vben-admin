# Canvas Interaction Optimization — FlowArea Infinite Canvas

## TL;DR

> **Quick Summary**: 修复 FlowArea.vue 画布的 7 个交互缺陷（拖动跳变、事件泄露、缩放异常、坐标偏差等），将固定 20000px 容器改造为动态无限画布，并通过 Playwright 进行全场景 QA 验证。
>
> **Deliverables**:
> - 修复后的 `FlowArea.vue`（重写鼠标事件系统、动态画布尺寸）
> - 修复后的 `AppMain.vue`（缩放初始化 + 工具栏联动）
> - Playwright QA 证据文件（截图 + 日志）
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves, max 3 concurrent
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5

---

## Context

### Original Request
对 `apps/web-ele/src/views/processManage/Visual.vue` 中的画布功能进行全面检查与优化：
1. 无限画布四向自由拖动
2. 修复刷新后缩放至 60% 异常
3. 优化右键拖动位置不跟手
4. 修复鼠标拖动功能失效
5. 修复拖动状态清除不完整
6. 全面排查其他交互问题
7. 全面测试验证

### Interview Summary

**Key Discussions**:
- **交互模型**: 右键平移画布，左键保留矩形框选节点（维持现有交互逻辑，仅修复技术故障）
- **缩放持久化**: 每次刷新固定 100% 默认缩放，不使用 localStorage
- **无限画布**: 改为动态无限画布，移除固定的 20000×20000px 容器尺寸
- **测试策略**: Agent 执行 Playwright QA，不编写 vitest 单元测试
- **审查精度**: 标准审查（Metis + 自检查）

**Code Analysis Findings** (7 identified issues):
| # | 问题 | 根因 | 文件:行 |
|---|---|---|---|
| 1 | 刷新后缩放至 60% | 最小缩放边界 0.6，mount 时未显式初始化为 1 | FlowArea.vue:258-260 |
| 2 | 右键拖动位置不跟手 | `mouse.tempPos` 复制自上一次 `mousemove` 的旧坐标，未从 `mousedown` event 计算 | FlowArea.vue:143-146 |
| 3 | 左键/右键拖动失效 | 左键绑定矩形框选（设计意图），右键拖动因事件泄露在特定场景失效 | FlowArea.vue:155-168 |
| 4 | 拖动状态无法清理 | `@mouseup` 仅绑定在 `#efContainer`，鼠标离开容器后释放不触发 | FlowArea.vue:172-182, 638 |
| 5 | 缺少 `mouseleave` 处理 | 无 `@mouseleave` 事件，拖出容器后状态残留 | FlowArea.vue:629-642 |
| 6 | 边界裁剪不一致 | `dragContainer()` 简单裁剪 vs `clampPanPosition()` 综合裁剪 | FlowArea.vue:224-253 |
| 7 | 死代码 + 无节流 | `container.isdrag` 定义未使用，`mousemove` 每像素触发 | FlowArea.vue:32, 155 |

### Metis Review
> Metis 任务超时未完成。已通过深入的代码审查手动覆盖了 Metis 通常识别的 gap 类型（边界条件、事件泄露、坐标计算精度、CSS 联动影响）。

---

## Work Objectives

### Core Objective
修复 FlowArea.vue 画布的全部 7 个交互缺陷，并将固定 20000px 容器改造为根据节点位置动态扩展的无限画布。

### Concrete Deliverables
- `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue` — 重写的画布组件
- `apps/web-ele/src/views/processManage/components/AppMain.vue` — 缩放初始化修复
- `.sisyphus/evidence/` — Playwright QA 证据文件

### Definition of Done
- [ ] `pnpm dev` 启动后画布默认 100% 缩放
- [ ] 右键拖动跟手、无跳变
- [ ] 鼠标拖出画布后释放，拖动状态正确清理
- [ ] 画布能向四个方向自由平移，无内容被截断
- [ ] 滚轮缩放以鼠标位置为中心，缩放范围 0.3~3
- [ ] 缩放时画布边界自动适配
- [ ] 所有 Playwright QA 场景通过

### Must Have
- 右键拖动画布流畅跟手（无首次跳变）
- 页面刷新后缩放为 100%
- 拖动状态在 mouseup/mouseleave 时正确清理
- 动态无限画布（容器尺寸根据节点位置自适应）
- 统一的边界裁剪逻辑

### Must NOT Have (Guardrails)
- **不改变**左键框选节点的交互行为
- **不修改** FlowNode.vue 节点拖动的实现（已正常工作）
- **不修改** jsPlumb 连接线逻辑
- **不修改** Pinia store 的接口定义
- **不引入**新的第三方 pan-zoom 库（保持轻量自实现）
- **不添加** localStorage 持久化逻辑
- **不添加** AI 过度抽象（避免将简单的坐标计算提取为工具函数）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed via Playwright.

### Test Decision
- **Infrastructure exists**: YES (Vitest + happy-dom configured)
- **Automated tests**: None (Agent QA only)
- **Framework**: Playwright (via `/playwright` skill)

### QA Policy
Every task includes Playwright QA scenarios executed after implementation.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.png`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — sequential within wave, both modify FlowArea.vue):
├── Task 1: Refactor mouse event system in FlowArea.vue [deep] (runs first)
└── Task 2: Dynamic infinite canvas + unified clamping [deep] (runs after Task 1, same file)

Wave 2 (After Wave 1 — 3 parallel tasks, different files/concerns):
├── Task 3: Zoom initialization + range fix [quick]
├── Task 4: AppMain.vue zoom toolbar sync [quick]
└── Task 5: Full Playwright QA suite [visual-engineering]

Critical Path: Task 1 → Task 2 → Task 5
Parallel Speedup: Wave 2 runs 3 tasks concurrently (~60% faster than sequential)
Max Concurrent: 3 (Wave 2)
```

### Agent Dispatch Summary

- **Wave 1**: **2** — T1 → `deep`, T2 → `deep`
- **Wave 2**: **3** — T3 → `quick`, T4 → `quick`, T5 → `visual-engineering`

---

## TODOs

- [ ] 1. **Refactor mouse event system in FlowArea.vue**

  **What to do**:
  1. **Fix drag jump (Issue #2)**: In `mousedownHandler`, compute `mouse.tempPos` directly from the `MouseEvent` coordinates instead of copying stale `mouse.position`:
     ```ts
     const rect = efContainer.value.getBoundingClientRect();
     mouse.tempPos = {
       x: (e.clientX - rect.left) / container.zoom,
       y: (e.clientY - rect.top) / container.zoom,
     };
     ```
  2. **Fix drag state cleanup (Issues #4, #5)**: Replace the `@mouseup` on `#efContainer` with document-level listeners added in `mousedownHandler`:
     - In `mousedownHandler`, call `document.addEventListener('mouseup', mouseupHandler)` and `document.addEventListener('mouseleave', mouseupHandler)` (on `document.documentElement`).
     - In `mouseupHandler`, call `document.removeEventListener(...)` for both before resetting `container.dragging = false`.
     - Ensure `mouseupHandler` is a stable reference (use a named function, not inline).
  3. **Remove dead code (Issue #7)**: Delete `isdrag: false` from the `container` reactive (line 32).
  4. **Add throttling (Issue #7)**: Import `useThrottleFn` from `@vueuse/core`. Wrap the drag/zoom logic inside `mousemoveHandler` with a 16ms (~60fps) throttle. The mouse position tracking (for display) should remain unthrottled.
  5. **Ensure right-click drag robustness**: Remove the `e.preventDefault()` call inside `mousedownHandler` for button 2 and move it to a `contextmenu` event listener that also sets `container.dragging = false` to prevent the context menu from interfering with drag initiation.
  6. **Verify FlowNode drag is not broken**: FlowNode uses its own `document.addEventListener('mousemove', mm)` — ensure the throttled global mousemove doesn't interfere. (It won't — Vue event handlers and `addEventListener` are separate dispatch paths.)

  **Must NOT do**:
  - Do NOT change left-click behavior (keep `multiSelectNodes()` on button 0)
  - Do NOT modify FlowNode.vue
  - Do NOT change the event binding on the template (the `@mousedown`, `@mousemove`, `@wheel` stay on `#efContainer`)

  **Recommended Agent Profile**:
  > Vue 3 composition API refactoring with precise event handling.
  - **Category**: `deep`
    - Reason: Multi-step event system refactoring with document-level listener management, requiring careful state lifecycle handling.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - N/A — no specialized skills needed for Vue event handling refactoring.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, Task 5
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL — Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue:221-243` — Correct document-level mouse listener pattern: `mousedown` → `document.addEventListener('mousemove', mm)` + `document.addEventListener('mouseup', mu)`, with cleanup in `mu()`. FlowArea should follow this exact pattern.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:143-182` — Current (broken) mouse handlers to replace.

  **API/Type References** (contracts to implement against):
  - `apps/web-ele/src/views/processManage/components/AppMain.vue:50-58` — Parent component calls `flowAreaRef.value?.zoomIn()`, `zoomOut()`, `resetZoom()`. These methods must remain exposed.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:625` — `defineExpose` list must stay intact.

  **External References** (libraries):
  - VueUse docs: `useThrottleFn` — `import { useThrottleFn } from '@vueuse/core'`. Already in dependencies (`@vueuse/core` in package.json).

  **WHY Each Reference Matters**:
  - FlowNode.vue's `md()`/`mm()`/`mu()` pattern is the proven approach in this codebase — FlowArea must replicate this pattern for drag.
  - AppMain.vue reference ensures exposed API doesn't break.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Right-click drag follows cursor smoothly with no jump
    Tool: Playwright
    Preconditions: Page loaded at http://localhost:5173, canvas has nodes rendered
    Steps:
      1. Navigate to the process visual page (ensure canvas is visible)
      2. Move mouse to center of canvas area (.flow-area-container)
      3. Press right mouse button (button: 'right')
      4. Move mouse 200px to the right, then 100px down (smooth movement)
      5. Release right mouse button
      6. Verify canvas position changed — check that efContainer's computed style left/top changed
    Expected Result: Canvas moves exactly with cursor — the same node that was under cursor at drag start is under cursor after drag (no jump). The initial position change on first mousemove should be small (<5px delta with normal mouse speed).
    Failure Indicators: Canvas jumps >20px on first mousemove, or canvas doesn't follow cursor at all (stays in place).
    Evidence: .sisyphus/evidence/task-1-drag-smooth.png

  Scenario: Drag state cleans up when mouse released outside canvas
    Tool: Playwright
    Preconditions: Canvas visible with nodes
    Steps:
      1. Right-click mousedown on canvas center
      2. Move mouse outside the browser viewport (to x=0, y=0 rapidly)
      3. Release right mouse button outside viewport
      4. Move mouse back onto canvas area — do NOT press any button
    Expected Result: Canvas does NOT continue panning. `container.dragging` should be false — no drag movement occurs when just moving mouse (without pressing).
    Failure Indicators: Canvas continues to follow mouse movement after release — drag state leaked.
    Evidence: .sisyphus/evidence/task-1-drag-cleanup.png

  Scenario: Drag state cleans up when mouse leaves canvas element
    Tool: Playwright
    Preconditions: Canvas visible with nodes
    Steps:
      1. Right-click mousedown on canvas center
      2. Move mouse rapidly to the left sidebar area (.left-aside) — outside #efContainer
      3. Release right mouse button while over sidebar
      4. Move mouse back onto canvas — do NOT press any button
    Expected Result: canvas.dragging resets to false. Moving mouse over canvas without pressing does not pan.
    Failure Indicators: Canvas pans without mouse button held.
    Evidence: .sisyphus/evidence/task-1-drag-mouseleave.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshots showing canvas state before/after drag operations
  - [ ] Console log check: no uncaught errors or "cannot read property of null"

  **Commit**: YES
  - Message: `fix(visual): refactor canvas mouse event system for robust drag handling`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue`

- [ ] 2. **Dynamic infinite canvas + unified pan clamping**

  **What to do**:
  1. **Dynamic container sizing (replaces fixed 20000px)**:
     - Remove the fixed CSS `height: 20000px; width: 20000px` from `#efContainer` in `<style scoped>`.
     - Add a computed `containerSize` that calculates `width = max(viewport * 2, maxNodeX + 2000)` and `height = max(viewport * 2, maxNodeY + 2000)` based on current `nodeList`.
     - Apply `containerSize` via inline `:style` on `#efContainer`.
     - Watch `nodeList` and `container.zoom` to recalculate size.
     - Set a minimum of `viewportWidth * 2 / zoom` to always allow panning room.
  2. **Unified clamping (Issue #6)**:
     - Replace the simple clamp in `dragContainer()` (lines 249-250) with a call to a refactored `clampPanPosition()`.
     - Refactor `clampPanPosition()` to work correctly with the dynamic canvas: use `containerSize` values instead of the old `getCanvasSize()` function.
     - Remove the old `getCanvasSize()` and `getViewportSize()` helper functions — integrate their logic into `clampPanPosition`.
     - Ensure clamping works for all 4 directions: top bound (0), left bound (0), bottom bound (prevents exposing whitespace below), right bound (prevents exposing whitespace to the right).
  3. **Coordinate consistency in `dragContainer()`**:
     - The formula `(mouse.position.y - mouse.tempPos.y) * container.zoom` is correct (zoom factors cancel out). But verify: `mouse.position` is in canvas coords (divided by zoom), so delta is in canvas coords, multiplied by zoom gives screen-pixel delta for CSS positioning. This is correct. ⚠️ DO NOT change this formula without understanding the double-transform: CSS `left/top` AND CSS `transform: scale()` both apply.
  4. **Auto-recenter on empty canvas**: When `nodeList` is empty and `containerSize` is at minimum, call `clampPanPosition(0, 0)` which should center the empty canvas in the viewport.

  **Must NOT do**:
  - Do NOT change the zoom math in `mouseWheelAction` (it's correct — zoom-toward-mouse)
  - Do NOT change `efContainerStyle` computed — it uses `container.pos` and `container.zoom` correctly
  - Do NOT remove the `transform: scale()` approach — keep CSS transform for zoom

  **Recommended Agent Profile**:
  > Complex coordinate math with multiple input dependencies (node positions, viewport size, zoom level).
  - **Category**: `deep`
    - Reason: Dynamic sizing requires careful coordination of computed properties, watchers, and CSS — errors here cause severe visual bugs.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (same file as Task 1 — runs sequentially after it)
  - **Parallel Group**: Wave 1 (sequential — after Task 1)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: Task 1

  **References** (CRITICAL — Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:211-215` — Current `getCanvasSize()` function to refactor.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:224-253` — Current `clampPanPosition()` and `dragContainer()` to unify.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:577-582` — `efContainerStyle` computed — must remain compatible.

  **API/Type References** (contracts to implement against):
  - `apps/web-ele/src/store/modules/processVisual.ts:62-63` — `nodeList` ref — use `storeToRefs` to watch for changes.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:14-18` — Store refs already imported.

  **External References** (libraries):
  - CSS `transform: scale()` behavior: When combined with `left`/`top` positioning, the visual position of an absolutely positioned child is `(left * scale, top * scale)` relative to parent when `transform-origin: 0 0`. This is correctly configured in `efContainerStyle`.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Canvas pans freely in all 4 directions without exposing whitespace
    Tool: Playwright
    Preconditions: Canvas has at least 3 nodes spread across coordinates (100,100), (3000,2000), (800,5000)
    Steps:
      1. Right-drag canvas all the way to the right for 2 seconds
      2. Right-drag canvas all the way down for 2 seconds
      3. Right-drag canvas all the way to the left for 2 seconds
      4. Right-drag canvas all the way up for 2 seconds
      5. At each extreme, check that the furthest node is still visible but no large blank area appears
    Expected Result: In all 4 directions, canvas pans smoothly without "hitting a wall" where nodes are cut off, and without exposing large empty areas.
    Failure Indicators: Canvas stops moving in any direction while nodes exist beyond that boundary, OR canvas exposes >viewport-height of white space.
    Evidence: .sisyphus/evidence/task-2-pan-boundary.png

  Scenario: Container expands when nodes are added at far coordinates
    Tool: Playwright
    Preconditions: Canvas with one node at (100, 100)
    Steps:
      1. Drag a new node from sidebar to canvas position approximately (5000, 5000) — or use the context menu "添加节点" at that position
      2. Right-drag canvas to scroll to the far-right area
      3. Verify the node at ~(5000, 5000) is visible and reachable
    Expected Result: Canvas scrolls to show the distant node. No content is permanently cut off.
    Failure Indicators: Cannot scroll to the far node — container doesn't expand.
    Evidence: .sisyphus/evidence/task-2-dynamic-expand.png

  Scenario: Zooming respects dynamic boundaries
    Tool: Playwright
    Preconditions: Canvas with nodes at various positions
    Steps:
      1. Zoom in to 200% (click "+" twice)
      2. Pan to all 4 extremes
      3. Zoom out to 50% (scroll wheel down)
      4. Pan to all 4 extremes
    Expected Result: Clamping adjusts with zoom level. At high zoom, can scroll further to see detail. At low zoom, entire canvas is visible.
    Failure Indicators: Nodes become unreachable at certain zoom levels.
    Evidence: .sisyphus/evidence/task-2-zoom-boundary.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshots at each boundary extreme
  - [ ] Check container inline style width/height reflects dynamic calculation

  **Commit**: YES
  - Message: `feat(visual): dynamic infinite canvas with unified pan clamping`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue`

- [ ] 3. **Fix zoom initialization and range**

  **What to do**:
  1. **Ensure default 100% on mount (Issue #1)**: Add an `onMounted` block in FlowArea.vue that explicitly sets `container.zoom = 1` and `container.pos = { top: 0, left: 0 }` and calls `jsPlumbInstance?.setZoom(1)`. Currently `initJsPlumb()` is called in `onMounted` but doesn't touch zoom.
  2. **Expand zoom range**: Change minimum zoom from `0.6` to `0.3` to allow more zoom-out room for large canvases. Maximum stays at `2`. Update `mouseWheelAction` (line 260) and `zoomOut` (line 288).
  3. **Add intermediate zoom step**: The current `mouseWheelAction` scaling factor `-0.001` is very fine — confirm it's intentional or increase to `-0.003` for more responsive wheel zoom.
  4. **Fix zoom-toward-mouse precision**: The current math in `mouseWheelAction` (lines 264-270) uses integer division that may lose precision. Use floating-point consistently:
     ```ts
     const scale = z / prevZoom;
     container.pos.left += mx * (1 - scale);
     container.pos.top += my * (1 - scale);
     ```
     (This is algebraically equivalent but avoids the intermediate integer rounding)
  5. **Ensure `jsPlumb.setZoom()` is always called**: After every zoom change in `zoomIn`, `zoomOut`, `resetZoom`, AND `mouseWheelAction`, verify `jsPlumbInstance?.setZoom(container.zoom)` is called.

  **Must NOT do**:
  - Do NOT add localStorage persistence
  - Do NOT change the zoom indicator (`.zoom-indicator`) in the template — it reads `container.zoom` reactively

  **Recommended Agent Profile**:
  > Simple numeric adjustments and initialization guard.
  - **Category**: `quick`
    - Reason: Small changes to zoom constants and initialization — low risk, few lines.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:256-277` — `mouseWheelAction` — modify zoom range and precision.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:279-297` — `zoomIn`, `zoomOut`, `resetZoom` — update min value.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:613-618` — `onMounted` — add zoom init.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:590` — `zoomPercent` computed — verify it reads correctly after changes.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Page refresh shows 100% zoom (not 60%)
    Tool: Playwright
    Preconditions: None (fresh page load)
    Steps:
      1. Navigate to the process visual page: page.goto('http://localhost:5173/#/process-manage/visual?fid=TEST_ID')
      2. Wait for canvas to render (waitForSelector('.flow-area-container'))
      3. Check the zoom indicator text (.zoom-indicator) contains "100%"
      4. Take a screenshot
    Expected Result: Zoom indicator shows "缩放: 100%". Canvas is at default scale.
    Failure Indicators: Zoom indicator shows "60%" or any value other than "100%" on fresh load.
    Evidence: .sisyphus/evidence/task-3-default-zoom.png

  Scenario: Scroll wheel zooms centered on mouse position (0.3 to 2 range)
    Tool: Playwright
    Preconditions: Canvas with nodes at center area
    Steps:
      1. Hover mouse over the center of canvas
      2. Scroll wheel down 10 times rapidly (mouse.wheel with deltaY=100 each)
      3. Screenshot — verify zoom indicator shows ≤30% (0.3 × 100)
      4. Scroll wheel up 20 times rapidly
      5. Screenshot — verify zoom indicator shows 200% (max)
    Expected Result: Zoom stops at 30% min and 200% max. The point under cursor stays approximately in the same screen position during zoom.
    Failure Indicators: Zoom goes below 30% or above 200%, OR the canvas jumps/disappears during zoom.
    Evidence: .sisyphus/evidence/task-3-zoom-range.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot confirming 100% on fresh load
  - [ ] Screenshots at min zoom (30%) and max zoom (200%)

  **Commit**: YES
  - Message: `fix(visual): ensure default 100% zoom on page refresh`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue`

- [ ] 4. **Sync AppMain.vue zoom toolbar with canvas state**

  **What to do**:
  1. The zoom toolbar in `AppMain.vue` (lines 225-229) calls `flowAreaRef.value?.zoomIn()`, `zoomOut()`, `resetZoom()`. These methods are exposed via `defineExpose` in `FlowArea.vue`.
  2. Verify that after Task 1+2+3 changes, these methods still work correctly and don't conflict with the new clamping/dynamic sizing.
  3. The `computeCanvasPosition()` function in AppMain.vue (lines 117-129) directly mutates `flowAreaRef.value.container.pos`. After the dynamic canvas refactor, this should still work but verify it doesn't need to trigger a size recalculation. Add a `nextTick` + `clampPanPosition` call after setting container.pos.
  4. If `computeCanvasPosition` sets a position that violates the new clamping rules, it should be auto-corrected. Add: after setting `container.pos`, call `flowAreaRef.value?.clampPanPosition()` (which should be added to `defineExpose` in FlowArea.vue if not already).

  **Must NOT do**:
  - Do NOT change the zoom toolbar UI
  - Do NOT add new zoom methods — only fix existing ones

  **Recommended Agent Profile**:
  > Minor integration fixes between two components.
  - **Category**: `quick`
    - Reason: 2-3 line changes to ensure interop — validate, fix, done.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 2

  **References**:

  **Pattern References** (existing code to follow):
  - `apps/web-ele/src/views/processManage/components/AppMain.vue:50-58` — Zoom control methods.
  - `apps/web-ele/src/views/processManage/components/AppMain.vue:117-129` — `computeCanvasPosition()` — add clamping call.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:625` — `defineExpose` — add `clampPanPosition` if needed.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Zoom toolbar buttons work after canvas refactor
    Tool: Playwright
    Preconditions: Canvas loaded with nodes
    Steps:
      1. Click the "+" zoom button 5 times
      2. Verify zoom indicator shows 150%
      3. Click the "100%" reset button
      4. Verify zoom indicator shows "100%"
      5. Click the "−" zoom button 5 times
      6. Verify zoom indicator shows ≥50% (if min is 0.3, 5×-0.1 = 0.5)
    Expected Result: All three zoom toolbar buttons function correctly. The "100%" button always resets to zoom=1, pos=(0,0).
    Failure Indicators: Buttons have no effect, or values don't match expected.
    Evidence: .sisyphus/evidence/task-4-zoom-toolbar.png

  Scenario: Canvas auto-centers on loaded nodes
    Tool: Playwright
    Preconditions: Page loaded with flow data containing nodes
    Steps:
      1. Wait for nodes to render after data load
      2. Verify that at least one node is visible in the viewport (not scrolled off-screen)
      3. The canvas should NOT be showing a completely blank area
    Expected Result: After data loads, the canvas pans to show the loaded nodes. They should be centered in the viewport.
    Failure Indicators: All nodes are off-screen after load — canvas stays at (0,0) or random position.
    Evidence: .sisyphus/evidence/task-4-auto-center.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshots of each zoom level from toolbar
  - [ ] Screenshot showing nodes centered after data load

  **Commit**: YES
  - Message: `fix(visual): sync zoom toolbar with canvas state`
  - Files: `apps/web-ele/src/views/processManage/components/AppMain.vue`

- [ ] 5. **Full Playwright QA suite — all scenarios**

  **What to do**:
  Run the complete Playwright QA suite to verify ALL fixes. This task executes the QA scenarios defined in Tasks 1-4 plus additional cross-cutting tests.

  **Test Matrix**:

  | Test | Tool | What it validates |
  |------|------|-------------------|
  | Right-click drag smooth | Playwright | Issue #2 fix — no jump on first drag |
  | Drag cleanup (mouse outside) | Playwright | Issues #4, #5 — document-level listener cleanup |
  | Drag cleanup (mouseleave canvas) | Playwright | Issues #4, #5 — mouseleave handler |
  | 4-direction pan boundary | Playwright | Issue #6 + dynamic canvas — unified clamping |
  | Dynamic container expand | Playwright | Dynamic infinite canvas — size recalculation |
  | Zoom at boundaries | Playwright | Issue #6 — clamping at different zoom levels |
  | Default 100% on refresh | Playwright | Issue #1 — zoom initialization |
  | Scroll wheel zoom range | Playwright | Issue #1 — zoom 0.3–2 range |
  | Zoom toolbar buttons | Playwright | Task 4 — zoomIn/zoomOut/resetZoom |
  | Auto-center on node load | Playwright | Task 4 — computeCanvasPosition |
  | Left-click rectangle select | Playwright | Regression — ensure rectangle select still works |
  | Node drag (FlowNode) | Playwright | Regression — ensure per-node drag not broken |
  | Rapid zoom + pan combination | Playwright | Cross-cutting — stress test |
  | Context menu on canvas | Playwright | Regression — right-click menu on empty canvas |

  **Execution Steps**:
  1. Start dev server: verify `pnpm --filter @vben/web-ele dev` is running
  2. For each scenario in the matrix, use Playwright (`/playwright` skill):
     - Navigate to the page
     - Execute the steps exactly as defined
     - Take screenshot on each assertion point
     - Save evidence to `.sisyphus/evidence/task-5-{test-name}.png`
  3. Collect all results into a summary table
  4. If any scenario fails, add details about the failure

  **Must NOT do**:
  - Do NOT skip any scenario
  - Do NOT write unit tests (vitest) — this is exclusively Playwright e2e QA

  **Recommended Agent Profile**:
  > Browser automation testing with visual verification.
  - **Category**: `visual-engineering`
    - Reason: Playwright browser automation for UI interaction testing with screenshot capture.
  - **Skills**: [`playwright`]
    - `playwright`: Required for browser-based interaction testing (click, drag, wheel, screenshot).

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (runs after Tasks 1-4 completion)
  - **Blocks**: Final Verification Wave
  - **Blocked By**: Task 1, Task 2, Task 3, Task 4

  **References**:

  **Pattern References** (existing code to follow):
  - All QA scenarios defined in Tasks 1-4 above.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:629-642` — Canvas DOM structure for selector construction.

  **Key Selectors for Playwright**:
  - Canvas container: `.flow-area-container`
  - Canvas element: `#efContainer`
  - Zoom indicator: `.zoom-indicator`
  - Zoom toolbar buttons: `.flow-toolbar .el-button`
  - 100% button: `.flow-toolbar .el-button:nth-child(3)`
  - Nodes: `.fn` (FlowNode class)
  - Left sidebar: `.left-aside`
  - Context menu: visible context menu element

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Left-click rectangle select works (regression)
    Tool: Playwright
    Preconditions: Canvas has 3+ nodes visible
    Steps:
      1. Left-click on empty canvas area (not on a node)
      2. Drag mouse diagonally 200px to create a selection rectangle
      3. Release left mouse button
      4. Verify at least one node has active state (check for .fn element with box-shadow or active class)
    Expected Result: Nodes within the selection rectangle become active (highlighted).
    Failure Indicators: No nodes selected, or error thrown during drag.
    Evidence: .sisyphus/evidence/task-5-rect-select.png

  Scenario: Node drag not broken by canvas changes (regression)
    Tool: Playwright
    Preconditions: Canvas has nodes
    Steps:
      1. Left-click on a node's title bar (.fnt element)
      2. Drag the node 100px to the right
      3. Release mouse
      4. Verify the node moved — its style.left changed by approximately 100px
    Expected Result: Individual nodes are still draggable. Canvas does not pan during node drag.
    Failure Indicators: Canvas pans instead of node moving, or node doesn't move.
    Evidence: .sisyphus/evidence/task-5-node-drag.png

  Scenario: Rapid zoom + pan stress test
    Tool: Playwright
    Preconditions: Canvas with 5+ nodes
    Steps:
      1. Scroll wheel zoom in 5 times rapidly
      2. Immediately right-drag canvas diagonally
      3. Scroll wheel zoom out 3 times
      4. Right-drag canvas in opposite direction
      5. Repeat 3 times quickly
      6. Verify no errors in console, zoom indicator shows a value within 0.3–2
    Expected Result: Canvas remains responsive. No jank, no errors, zoom stays within bounds.
    Failure Indicators: Console errors, zoom goes out of bounds, canvas disappears.
    Evidence: .sisyphus/evidence/task-5-stress-test.png
  ```

  **Evidence to Capture**:
  - [ ] `task-5-drag-smooth.png`
  - [ ] `task-5-drag-cleanup.png`
  - [ ] `task-5-drag-mouseleave.png`
  - [ ] `task-5-pan-boundary.png`
  - [ ] `task-5-dynamic-expand.png`
  - [ ] `task-5-zoom-boundary.png`
  - [ ] `task-5-default-zoom.png`
  - [ ] `task-5-zoom-range.png`
  - [ ] `task-5-zoom-toolbar.png`
  - [ ] `task-5-auto-center.png`
  - [ ] `task-5-rect-select.png`
  - [ ] `task-5-node-drag.png`
  - [ ] `task-5-stress-test.png`

  **Commit**: NO (QA task only — commits handled by Tasks 1-4)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> Present results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read plan end-to-end. Verify all "Must Have" items exist. Check for "Must NOT Have" violations.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run typecheck + linter. Review changed files for: `as any`, empty catches, console.log in prod, commented-out code, unused imports, AI slop.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Re-run ALL QA scenarios from Task 5. Test cross-task integration. Test edge cases.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

---

## Commit Strategy

- **1**: `fix(visual): refactor canvas mouse event system for robust drag handling` — `FlowArea.vue`
- **2**: `feat(visual): dynamic infinite canvas with unified pan clamping` — `FlowArea.vue`
- **3**: `fix(visual): ensure default 100% zoom on page refresh` — `FlowArea.vue`
- **4**: `fix(visual): sync zoom toolbar with canvas state` — `AppMain.vue`

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter @vben/web-ele dev    # Expected: app starts, canvas at 100%
```

### Final Checklist
- [ ] Right-click drag is smooth on first movement (no jump)
- [ ] Drag state cleans up when mouse released outside canvas
- [ ] Canvas pans freely in all 4 directions
- [ ] Default zoom is 100% on refresh
- [ ] Scroll-wheel zoom centers on mouse position
- [ ] Canvas container expands dynamically with node positions
- [ ] All QA scenarios pass (Task 5 evidence exists)
