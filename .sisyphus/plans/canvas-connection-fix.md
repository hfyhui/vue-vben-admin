# Canvas Connection Point Fix & Optimization

## TL;DR

> **Quick Summary**: Fix three canvas connection point types (triangle, red hollow circle, regular hollow circle) with correct visual rendering, strict connection validation rules, and precise anchor positioning — all in the jsPlumb-based flow editor within `apps/web-ele/src/views/processManage/`.
>
> **Deliverables**:
> - Three visually distinct port types rendered correctly (triangle, red hollow circle, regular hollow circle)
> - Type-based connection validation (flow↔flow, input↔output) with ElMessage error feedback
> - Connection lines anchored precisely at port visual center (not above/below)
> - Updated port color assignment to use portType instead of arbitrary color mapping
>
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 3 (anchor fix) → Task 4 (validation rewrite) → Task 7 (cross-type QA)

---

## Context

### Original Request
用户要求对 `Visual.vue` 画布连接逻辑进行全面检查与优化，实现三种连接点（三角、红色空心圆、空心圆）的正确视觉标识与连接规则，并修复连接线定位偏移问题。

### Interview Summary
**Key Discussions**:
- **Port type mapping**: `portType='flow'` → 三角, `portType='input'` → 红色空心圆, `portType='output'` → 空心圆
- **Enforcement strategy**: 验证+错误提示（非scope级别阻止），保留拖拽体验
- **Test strategy**: 仅Agent-QA，无需搭建测试框架

**Research Findings**:
- 当前 `checkConnectingPorts()` 仅校验 flow↔flow，未区分 input/output 类型
- 所有圆形端口共用 `.sp` CSS类，颜色来自 `port.cls?.color` 而非 portType
- `addAP()` 中y轴位置计算使用累计高度(`ya`)，未计入端口间margin/padding，导致锚点偏移
- 项目无现有测试基础设施（无vitest/jest配置，无测试文件）

### Metis Review
Metis consultation timed out — skipped. Self-review incorporated below.

---

## Work Objectives

### Core Objective
修复并优化 `FlowPort.vue`（端口渲染与校验）、`FlowNode.vue`（锚点定位）、`FlowArea.vue`（端口颜色赋值）中的连接点逻辑，使三种端口类型具有正确的视觉样式、严格的连接规则和精确的连线定位。

### Concrete Deliverables
- `FlowPort.vue` — 三种端口视觉效果 + 重写 `checkConnectingPorts()` 校验逻辑
- `FlowNode.vue` — 修复 `addAP()` 锚点y轴定位
- `FlowArea.vue` — 更新 `createNodeWithPos()` 端口颜色赋值逻辑

### Definition of Done
- [ ] 三角端口（portType='flow'）正确渲染且仅能与三角端口连接
- [ ] 红色空心圆端口（portType='input'）正确渲染，颜色固定为红色(#f23433)
- [ ] 空心圆端口（portType='output'）正确渲染，颜色由dataType映射（保留现有逻辑）
- [ ] 连接线精确对齐到端口视觉中心（水平方向：右端口右边缘中心，左端口左边缘中心）
- [ ] 跨类型连接被正确拒绝并显示 ElMessage 错误提示

### Must Have
- 三种端口视觉标识严格区分
- 连接规则严格执行（flow↔flow, input↔output, output↔input）
- 连接线定位精确
- 不破坏现有拖拽、缩放、表单输入等功能

### Must NOT Have (Guardrails)
- **禁止**修改 jsPlumb scope 配置（用户选择验证方式而非scope阻止）
- **禁止**修改 FlowPort 的表单输入逻辑（el-input, el-select等）
- **禁止**修改 FlowArea 的拖拽/缩放/右键菜单功能
- **禁止**添加单元测试框架（用户选择Agent-QA only）
- **禁止**为 portType 新增字段或修改 `types.ts` 类型定义（portType已存在）
- **禁止**修改 `Visual.vue` 页面级代码（画布逻辑在子组件中）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: N/A
- **QA**: Agent-executed via browser (dev server + Playwright)

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — visual + config):
├── Task 1: Update FlowPort.vue visual styles (3 port types) [visual-engineering]
├── Task 2: Update FlowArea.vue port color assignment [quick]
└── Task 3: Fix FlowNode.vue anchor positioning [deep]

Wave 2 (After Wave 1 — validation + QA):
├── Task 4: Rewrite checkConnectingPorts() validation [deep]
├── Task 5: QA — triangle port visual + connection [visual-engineering]
├── Task 6: QA — red hollow + regular hollow port visual + connection [visual-engineering]
└── Task 7: QA — cross-type rejection + line positioning [visual-engineering]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA — all scenarios [unspecified-high]
└── Task F4: Scope fidelity check [deep]
```

**Critical Path**: Task 3 → Task 4 → Task 7 → F1-F4

---

## TODOs

- [ ] 1. Update FlowPort.vue visual styles — three port type visuals

  **What to do**:
  - Add a `portVisualType` computed property in `<script setup>` that returns `'triangle'` when `portType === 'flow'`, `'red-circle'` when `portType === 'input'`, and `'circle'` for all other types (output, etc.)
  - **Triangle (flow)**: Keep existing `.fp` CSS class and `cf` connected state class — NO changes needed, already correct
  - **Red hollow circle (input)**: Add new CSS class `.rp` (red-point):
    - `width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;`
    - `border: 2px solid #f23433;` (red, not fill-color dependent)
    - `background-color: #fff;` (hollow — always white background, even when connected)
    - Connected state `.rp-connected`: `background-color: #f23433;` (filled red when connected)
  - **Regular hollow circle (output/other)**: Keep existing `.sp` CSS class — already correct (border-radius 50%, color from portColor)
  - Update the `<template>` in all three rendering branches to use the correct CSS class:
    - Branch 1 (`v-if="isFlow"`): Keep `.fp` + `.cf` — triangle, no change
    - Branch 2 (`v-else-if="!isData"`): Replace `.sp` with conditional `portVisualType === 'red-circle' ? '.rp' : '.sp'` and apply appropriate inline styles
    - Branch 3 (`<template v-else>` data with form): Same conditional circle rendering + add `portVisualType` to style binding
  - For red hollow circle: the `:style` binding should NOT use `portColor` for background — always white background, red border. Connected state uses red fill.
  - For regular hollow circle: keep existing behavior (white bg when unconnected, portColor bg when connected, portColor border)
  - Add computed `isFlow` (already exists, `portType === 'flow'`) and `isInput` (`portType === 'input'`)
  - Remove the old `isData` computed if it's only used for circle distinction (keep `isData` for form rendering logic — forms still work the same)

  **Must NOT do**:
  - Do NOT change the triangle visual (`.fp` CSS) — it already works correctly
  - Do NOT change the form input template branches (textarea, number, select, etc.)
  - Do NOT remove the `isConnected` computed or its usage
  - Do NOT change the `portColor` computed — still needed for regular circle rendering

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: CSS-heavy visual styling changes in a Vue SFC template
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: For precise CSS implementation of the three visual port types
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for implementation, only for QA verification tasks

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 5 (visual QA)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):
  **Pattern References** (existing code to follow):
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:396-411` — Current template branch structure: `v-if="isFlow"` (triangle), `v-else-if="!isData"` (simple circle), `<template v-else>` (circle with form). Understand all three branches before modifying.
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:575-603` — Current `.fp` (triangle), `.sp` (circle), `.cf` (connected triangle) CSS definitions. The `.rp` class should follow same pattern.

  **API/Type References** (contracts to implement against):
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:20` — `isFlow` computed: `props.port.portType === 'flow'`
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:21` — `isData` computed: `!isFlow.value && !!props.port.elementType`
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:22` — `portColor` computed: `props.port.cls?.color || '#959CB6'`

  **WHY Each Reference Matters**:
  - The template has three rendering branches — you must understand all three to add the new CSS class correctly to the TWO circle-rendering branches (simple circle + data-with-form circle)
  - The `.fp` class serves as the model: a port-type-specific CSS class with a connected-state variant (`.cf`). Follow this pattern for `.rp` / `.rp-connected`.

  **Acceptance Criteria**:
  - [ ] `portVisualType` computed returns correct values for portType 'flow', 'input', 'output'
  - [ ] `.rp` CSS class defined in `<style scoped>` with red border, white background, 10px circle
  - [ ] `.rp-connected` CSS class defined with red fill background
  - [ ] Simple circle branch (`v-else-if="!isData"`) uses correct CSS class based on `portVisualType`
  - [ ] Data-with-form circle branch uses correct CSS class based on `portVisualType`
  - [ ] Triangle branch unchanged
  - [ ] Form input functionality unchanged

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Red hollow circle renders correctly for input ports
    Tool: Playwright
    Preconditions: Dev server running, flow editor page loaded, add a node with portType='input' on left side
    Steps:
      1. Navigate to flow editor page
      2. Drag a "variable_set" node from sidebar to canvas (it has input ports with portType='input')
      3. Wait for node to render (timeout: 3s)
      4. Locate the left-side port circle element: `page.locator('.flow-node-drag.fnd.rp')`
      5. Assert element has CSS `border: 2px solid #f23433` or equivalent
      6. Assert element has CSS `background-color: #fff` or equivalent (hollow)
      7. Assert element has CSS `border-radius: 50%`
    Expected Result: Red hollow circle visible — red border, white center, circular shape
    Failure Indicators: No `.rp` element found, wrong border color, filled background instead of hollow
    Evidence: .sisyphus/evidence/task-1-red-circle-render.png

  Scenario: Triangle port renders correctly for flow ports
    Tool: Playwright
    Preconditions: Dev server running, flow editor page loaded, add a node with portType='flow'
    Steps:
      1. Navigate to flow editor page
      2. Add a start node (portType='flow') to canvas
      3. Locate the triangle port element: `page.locator('.flow-node-drag.fnd.fp')`
      4. Assert element exists and is visible
      5. Assert the triangle uses CSS border trick (border-left/border-top/border-bottom)
    Expected Result: Triangle port visible with CSS border-based triangle shape
    Failure Indicators: No `.fp` element found, wrong shape
    Evidence: .sisyphus/evidence/task-1-triangle-render.png

  Scenario: Regular hollow circle renders for output ports
    Tool: Playwright
    Preconditions: Dev server running, flow editor page loaded, add a node with portType='output'
    Steps:
      1. Navigate to flow editor page
      2. Add a node with output port (portType='output') to canvas
      3. Locate the right-side port circle: `page.locator('.sp')` (not `.rp`)
      4. Assert element has `border-radius: 50%`
    Expected Result: Regular hollow circle with portColor-based styling
    Failure Indicators: Output port uses `.rp` red circle class instead of `.sp`
    Evidence: .sisyphus/evidence/task-1-regular-circle-render.png
  ```

  **Evidence to Capture**:
  - [ ] `task-1-red-circle-render.png` — Screenshot of red hollow circle port
  - [ ] `task-1-triangle-render.png` — Screenshot of triangle port
  - [ ] `task-1-regular-circle-render.png` — Screenshot of regular hollow circle port

  **Commit**: NO (groups with Task 2)
  - Message: `style(flow): add three port type visual styles`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue`

- [ ] 2. Update FlowArea.vue port color assignment — portType-based colors

  **What to do**:
  - In `FlowArea.vue` → `createNodeWithPos()` function (line 413-437), update the port color assignment logic
  - Currently, port colors come from `colorByDataType` mapping (line 408-411) which maps dataType to color
  - Change to: use portType to determine color:
    - `portType === 'input'` → color `'#f23433'` (red — matching the red hollow circle)
    - `portType === 'flow'` → color `'#959CB6'` (grey — matching triangle)
    - All other types → keep existing `colorByDataType` mapping (for backward compat)
  - The assignment happens in lines 426-431 where `p.cls.color = colorByDataType[p.dataType] || '#176ac5'`
  - Add a new color mapping object `colorByPortType` for the portType-based colors
  - Priority: portType-based color first, fall back to dataType, fall back to `'#176ac5'`

  **Must NOT do**:
  - Do NOT remove the existing `colorByDataType` — it's the fallback
  - Do NOT change the node creation/cloning logic
  - Do NOT change `linkColor` assignment on link objects

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single function, small change, clear logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None needed — straightforward logic change

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: None directly (visual QA depends on this + Task 1 together)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):
  **Pattern References**:
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:408-411` — Current `colorByDataType` mapping. Follow the same pattern for `colorByPortType`.
  - `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue:426-431` — Current color assignment loop: `p.cls.color = colorByDataType[p.dataType] || '#176ac5'`. Modify this line to add portType priority.

  **API/Type References**:
  - `apps/web-ele/src/views/processManage/types.ts:37-48` — PortConfig interface with `cls: PortCls` (which has `color` field)

  **WHY Each Reference Matters**:
  - The `colorByDataType` mapping shows the existing pattern: a record mapping type→color with a fallback. Follow the same pattern.
  - The assignment loop iterates `['input', 'output']` sides — both sides need the portType-based color logic applied.

  **Acceptance Criteria**:
  - [ ] `portType='input'` ports assigned color `'#f23433'`
  - [ ] `portType='flow'` ports assigned color `'#959CB6'`
  - [ ] Other port types use dataType-based color with `'#176ac5'` fallback (existing behavior preserved)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Input port gets red color assigned
    Tool: Bash (node REPL)
    Preconditions: Code changes applied
    Steps:
      1. Search `FlowArea.vue` for `colorByPortType` to verify new mapping exists
      2. Search for `p.cls.color` assignment to verify portType priority logic
      3. Verify the assignment: `p.cls.color = colorByPortType[p.portType] || colorByDataType[p.dataType] || '#176ac5'`
    Expected Result: Code correctly assigns red (#f23433) for input ports, grey (#959CB6) for flow ports
    Failure Indicators: portType-based assignment missing, wrong colors
    Evidence: .sisyphus/evidence/task-2-color-assignment.txt

  Scenario: Flow port color assignment verified
    Tool: Bash (grep)
    Preconditions: Code changes applied
    Steps:
      1. grep for `colorByPortType` in FlowArea.vue
      2. grep for portType='flow' → '#959CB6' mapping
    Expected Result: Flow ports get grey color matching triangle visual
    Evidence: .sisyphus/evidence/task-2-flow-color.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-2-color-assignment.txt` — Grep output showing the color assignment code
  - [ ] `task-2-flow-color.txt` — Grep output showing flow port color mapping

  **Commit**: YES (groups with Task 1)
  - Message: `fix(flow): use portType-based color assignment`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue`

- [ ] 3. Fix FlowNode.vue anchor y-position alignment — 两级修复

  **根因分析**：
  当前锚点 Y 轴偏移由两个叠加错误导致：

  **错误① — 基准偏移**：`1.5 * TH = 60px` 是硬编码近似值，本应代表"节点顶部→端口区域顶部"的距离。
  实际 DOM 中：`border-top(2px) + .fnt标题栏(40px) + .fnt-border-bottom(1px) = 43px`。
  **偏差 +17px**，导致所有锚点系统性偏下。

  **错误② — 未居中**：原公式 `(1.5*TH + ya) / H` 中 `ya` 是端口顶部累计高度，锚点定位在端口顶部而非垂直中心。

  **What to do**:
  - In `FlowNode.vue` → `addAP()` function (line 120-156), apply **两级修复**：
  - **修复① — 用 DOM 实测替代硬编码 `1.5*TH`**：
    ```typescript
    const el = document.getElementById(props.node.id);
    const fntEl = el?.querySelector('.fnt') as HTMLElement;
    const nodeStyles = el ? getComputedStyle(el) : null;
    const fntStyles = fntEl ? getComputedStyle(fntEl) : null;
    const borderTop = nodeStyles ? parseFloat(nodeStyles.borderTopWidth) || 2 : 2;
    const fntBorderBottom = fntStyles ? parseFloat(fntStyles.borderBottomWidth) || 1 : 1;
    const titleBottom = fntEl
      ? borderTop + fntEl.offsetTop + fntEl.offsetHeight + fntBorderBottom
      : TH + borderTop + 1;
    ```
    其中 `titleBottom` = 端口区域顶部的精确 px 位置（动态测量，不依赖硬编码）。
  - **修复② — 端口垂直居中**：
    ```typescript
    const myHeight = pwh.value.find((p: any) => p.id === port.id)?.height || 0;
    const y = (titleBottom + ya + myHeight / 2) / H;
    ```
  - **修复原理**：`borderTop` 动态读取节点 border 宽度，`fntEl.offsetTop+offsetHeight+borderBottom` 精确测量标题栏实际占用空间。`titleBottom` 替换 `1.5*TH` 后消除 17px 基准偏差，`myHeight/2` 确保锚点在端口垂直中心。
  - The x-axis positioning is correct (0.05 for left, 0.95 for right) — only fix y.
  - Also effective in the `isUpdate` branch (lines 94-117) — the same `addAP()` function is called for reconnect logic.

  **Must NOT do**:
  - Do NOT change the x-position (already correct at 0.05/0.95)
  - Do NOT change the `addEndpoint` call structure (endpoint: 'Blank', anchor format)
  - Do NOT change the `TH = 40` constant
  - Do NOT change the port height tracking in `getPH()`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Subtle mathematical positioning fix that needs careful reasoning about accumulated heights and DOM layout
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None needed — pure math/logic fix

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7 (positioning QA)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):
  **Pattern References** (existing code to modify):
  - `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue:120-156` — Full `addAP()` function. Read the entire function to understand the anchor calculation.
  - `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue:141-148` — The `ya` accumulation loop. This is the key: `ya` currently adds all heights BEFORE index `i`. The fix adds `myHeight/2` to center on the current port.
  - `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue:149` — Current y formula: `const y = (1.5 * TH + ya) / H`. This is the line to modify.
  - `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue:94-117` — The `isUpdate` branch that reconnects existing links. Same y-formula is used implicitly when calling `addAP()` — verify it passes through.

  **WHY Each Reference Matters**:
  - The `ya` loop computes accumulated height of all ports ABOVE the current one. Adding `myHeight / 2` centers the anchor within the current port's vertical space.
  - The `H` variable is `el?.offsetHeight` (total node height). The anchor is expressed as a fraction of this. Understanding this fraction-based coordinate system is critical.

  **Acceptance Criteria**:
  - [ ] `titleBottom` calculated from DOM measurement (not hardcoded `1.5*TH`)
  - [ ] `borderTop` and `fntBorderBottom` read from computed styles (dynamic, not hardcoded)
  - [ ] Anchor y-position formula: `(titleBottom + ya + myHeight / 2) / H`
  - [ ] Fallback value `TH + borderTop + 1` when `.fnt` element not found
  - [ ] Both initial addAP calls (line 91) and update calls (line 99) produce correct y positions
  - [ ] Left-side anchors at x=0.05 with correct y (unchanged x)
  - [ ] Right-side anchors at x=0.95 with correct y (unchanged x)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Connection line starts/ends at port visual center
    Tool: Playwright
    Preconditions: Dev server running, flow editor loaded, at least 2 nodes with ports placed on canvas
    Steps:
      1. Add a node with output port (right side) and a node with input port (left side)
      2. Connect them by dragging from right port to left port
      3. Wait for connection line to render (timeout: 2s)
      4. Take a screenshot of the connection: `page.screenshot()`
      5. Visually verify the connection line starts at the right-center of the source port circle and ends at the left-center of the target port circle
      6. Check that the line does NOT start above or below the port
    Expected Result: Bezier curve start/end points align with port circle centers
    Failure Indicators: Line visibly starts above/below the port circle
    Evidence: .sisyphus/evidence/task-3-line-position.png

  Scenario: Multiple ports on same node have correct individual anchor positions
    Tool: Playwright
    Preconditions: Dev server running, a node with 2+ ports on one side
    Steps:
      1. Add a "variable_set" node (has 2 left ports: flow + input)
      2. Connect from another node's right port to EACH of the left ports separately
      3. Take screenshot showing both connections
      4. Verify each connection line ends at the center of its respective port (not overlapping or misaligned)
    Expected Result: Multiple connections target distinct port centers on the same node
    Failure Indicators: Lines converge to same spot, or miss ports entirely
    Evidence: .sisyphus/evidence/task-3-multi-port-position.png
  ```

  **Evidence to Capture**:
  - [ ] `task-3-line-position.png` — Screenshot showing connection alignment
  - [ ] `task-3-multi-port-position.png` — Screenshot showing multiple ports on same node

  **Commit**: NO (groups with Task 4)
  - Message: `fix(flow): correct anchor y-position alignment`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue`

- [ ] 4. Rewrite checkConnectingPorts() validation logic

  **What to do**:
  - In `FlowPort.vue` → `checkConnectingPorts()` function (line 153-274), rewrite the type-matching validation (checks 4-6) to enforce the new portType-based rules
  - **Current validation (checks 4-6)**:
    - Check 4: If either side is 'flow', both must be 'flow' → PARTIAL (only enforces flow)
    - Check 5: Flow port can only have one outgoing connection (source-side single)
    - Check 6: Data port can only have one incoming connection (target-side single)
  - **New validation logic (replace checks 4-6)**:
    - **Check 4 — Type matching**: Define allowed pairs:
      - `'flow'` can only connect to `'flow'`
      - `'input'` can only connect to `'output'`
      - `'output'` can only connect to `'input'`
      - Any other portType: reject with "不支持的端口类型"
    - Validation approach: compare `src.portType` and `tgt.portType` against the allowed pairs. If not in the allowed pairs, reject with `ElMessage.error('端口类型不匹配：${src.portType} 不能连接到 ${tgt.portType}')`
    - **Check 5 — Flow single-out**: Keep existing logic (flow source can only have one outgoing) — BUT fix: only apply when `src.portType === 'flow'`, not just when `isFlow`
    - **Check 6 — Data single-in**: Keep existing logic (data target can only have one incoming) — BUT fix: apply when `tgt.portType !== 'flow'` (non-flow targets should be single-in), not the current narrow condition
  - The `src` and `tgt` variables are already correctly assigned (line 219-220): source = right-side port, target = left-side port
  - Add clear, specific ElMessage error messages for each rejection case
  - Keep Check 1 (same node), Check 2 (same side — still commented out), Check 3 (duplicate) unchanged
  - **IMPORTANT**: The connection between `portType='input'` and `portType='output'` should work in EITHER direction — the src/tgt assignment already handles this by putting the right-side port as src and left-side as tgt regardless of which one is input/output

  **Must NOT do**:
  - Do NOT change checks 1-3 (same node, same side commented, duplicate)
  - Do NOT change the `addLink()` function
  - Do NOT change the `unLink()` function
  - Do NOT change the `connectDragging` watcher
  - Do NOT use jsPlumb scope — user chose validation approach

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex validation logic rewrite with cascading checks; requires careful reading of existing control flow
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - None — pure logic refactoring

  **Parallelization**:
  - **Can Run In Parallel**: NO (must run after Tasks 1, 2, 3 — depends on portType-based visual and color being in place)
  - **Parallel Group**: Wave 2 (sequential — run before QA Tasks 5, 6, 7)
  - **Blocks**: Tasks 5, 6, 7 (all QA depends on validation being correct)
  - **Blocked By**: Tasks 1, 2, 3 (portType visuals and colors must be in place for meaningful validation)

  **References** (CRITICAL):
  **Pattern References** (existing code to modify):
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:153-274` — Full `checkConnectingPorts()` function. Read the ENTIRE function before modifying.
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:170-174` — Source node lookup and source port position detection
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:185-196` — Source port lookup (checks input then output arrays)
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:219-230` — `src`/`tgt` assignment and type logging
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:240-252` — Current check 4 (type mismatch). **This is the block to rewrite.**
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:254-270` — Current checks 5-6 (single connection rules). **Fix conditions to use portType.**

  **API/Type References**:
  - `apps/web-ele/src/views/processManage/types.ts:37-48` — PortConfig with `portType: string` field

  **WHY Each Reference Matters**:
  - The function has detailed console.log statements that must be preserved/updated to match the new logic
  - The `src`/`tgt` assignment already correctly handles left/right direction — no need to change it
  - The single-connection rules need their conditions narrowed to match the new portType semantics

  **Acceptance Criteria**:
  - [ ] flow ↔ flow connections allowed
  - [ ] input ↔ output connections allowed (both directions)
  - [ ] flow → input rejected with error message
  - [ ] input → flow rejected with error message
  - [ ] flow → output rejected with error message
  - [ ] output → flow rejected with error message
  - [ ] Same-type connections not in allowed pairs rejected
  - [ ] Flow single-out rule applied only to flow ports
  - [ ] Non-flow single-in rule applied to all non-flow target ports

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: flow-to-flow connection succeeds
    Tool: Playwright
    Preconditions: Two nodes with flow ports on canvas (start node + end node)
    Steps:
      1. Locate the right-side triangle port of the start node: `page.locator('.fn').first().locator('.fp')`
      2. Locate the left-side triangle port of the end node
      3. Drag from start node's right triangle to end node's left triangle
      4. Wait for connection line to appear (timeout: 2s)
      5. Assert connection line exists between the two nodes
    Expected Result: Connection created successfully between two flow ports
    Failure Indicators: ElMessage error appears, no connection line
    Evidence: .sisyphus/evidence/task-4-flow-to-flow.png

  Scenario: input-to-output connection succeeds
    Tool: Playwright
    Preconditions: One node with output port (right side), one node with input port (left side)
    Steps:
      1. Drag a variable_set node and a variable_get node to canvas
      2. Drag from variable_get's right output port to variable_set's left input port
      3. Assert connection created successfully
    Expected Result: Connection created between input and output ports
    Evidence: .sisyphus/evidence/task-4-input-to-output.png

  Scenario: flow-to-input connection rejected
    Tool: Playwright
    Preconditions: Node with flow port (right) and node with input port (left) on canvas
    Steps:
      1. Drag from flow port (right triangle) to input port (left red circle)
      2. Assert ElMessage appears with text containing "不匹配" or "不能连接"
      3. Assert NO connection line appears
    Expected Result: Connection rejected with clear error message
    Failure Indicators: Connection created despite type mismatch, or no error message
    Evidence: .sisyphus/evidence/task-4-flow-to-input-reject.png

  Scenario: output-to-flow connection rejected
    Tool: Playwright
    Preconditions: Node with output port (right) and node with flow port (left) on canvas
    Steps:
      1. Drag from output port (right circle) to flow port (left triangle)
      2. Assert ElMessage error appears
      3. Assert NO connection line appears
    Expected Result: Connection rejected
    Evidence: .sisyphus/evidence/task-4-output-to-flow-reject.png
  ```

  **Evidence to Capture**:
  - [ ] `task-4-flow-to-flow.png` — Successful flow connection
  - [ ] `task-4-input-to-output.png` — Successful input-output connection
  - [ ] `task-4-flow-to-input-reject.png` — Rejected cross-type connection
  - [ ] `task-4-output-to-flow-reject.png` — Rejected cross-type connection

  **Commit**: YES (groups with Task 3)
  - Message: `fix(flow): enforce portType-based connection validation`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue`

- [ ] 5. QA — triangle port visual + connection end-to-end

  **What to do**:
  - Verify the complete triangle port workflow: visual rendering, connection creation (flow↔flow), connection rejection (flow↔non-flow)
  - Use the running dev server with all Task 1-4 changes applied
  - Execute Playwright scenarios to validate the triangle port end-to-end

  **Must NOT do**:
  - Do NOT make any code changes — this is a verification-only task
  - Do NOT test input/output ports — that's Task 6

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Browser-based visual verification using Playwright
  - **Skills**: [`playwright`]
    - `playwright`: For browser automation, drag-drop simulation, and screenshot capture
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — only testing, no styling changes

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7 — after Task 4 completes)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 3, 4 (all implementation must be done)

  **References** (CRITICAL):
  **Pattern References**:
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:396-411` — Triangle template: `<div v-if="isFlow" class="flow-node-drag fnd fp" :class="{ cf: isConnected }" />`
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:575-596` — Triangle CSS: `.fp` (border-based triangle) + `.cf::after` (connected state)

  **WHY Each Reference Matters**:
  - You need to locate the correct DOM selectors for Playwright: `.flow-node-drag.fnd.fp` for triangle ports
  - The `.cf` class indicates a connected triangle — use this to verify connection state

  **Acceptance Criteria**:
  - [ ] Triangle port renders with correct border-based shape
  - [ ] flow-to-flow connection created successfully
  - [ ] flow-to-input connection rejected
  - [ ] flow-to-output connection rejected

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Triangle port visual correctness
    Tool: Playwright
    Preconditions: Dev server running, flow editor loaded, start node (portType='flow') on canvas
    Steps:
      1. Navigate to flow editor page
      2. Locate start node by title or type
      3. Find triangle port: `page.locator('.flow-node-drag.fnd.fp').first()`
      4. Assert element is visible
      5. Check CSS properties: border-left is set, border-top/bottom create triangle shape
      6. Screenshot the port area
    Expected Result: Triangle shape rendered via CSS border trick, grey color (#959CB6)
    Failure Indicators: No `.fp` element found, wrong shape (circle instead of triangle)
    Evidence: .sisyphus/evidence/task-5-triangle-visual.png

  Scenario: Flow-to-flow connection creation
    Tool: Playwright
    Preconditions: Start node (right-side flow triangle) and end node (left-side flow triangle) on canvas
    Steps:
      1. Add start node to canvas (drag from sidebar or programmatic)
      2. Add end node to canvas
      3. Drag from start node's right triangle port to end node's left triangle port
      4. Wait for connection (timeout: 2s)
      5. Assert SVG path element exists connecting the two nodes
      6. Screenshot the connected state
    Expected Result: Bezier connection line between the two flow ports, arrow visible
    Failure Indicators: No connection line, ElMessage error, line misplaced
    Evidence: .sisyphus/evidence/task-5-flow-connection.png

  Scenario: Flow-to-input rejection
    Tool: Playwright
    Preconditions: Start node (flow, right) + variable_set node (input, left) on canvas
    Steps:
      1. Drag from start node's right triangle to variable_set node's left red circle
      2. Wait for ElMessage (timeout: 3s)
      3. Assert error message contains "不匹配" or type-related rejection text
      4. Assert no SVG connection path exists
      5. Screenshot showing no connection
    Expected Result: Error message displayed, no connection created
    Failure Indicators: Connection created despite type mismatch, no error shown
    Evidence: .sisyphus/evidence/task-5-flow-to-input-reject.png
  ```

  **Evidence to Capture**:
  - [ ] `task-5-triangle-visual.png` — Triangle port visual
  - [ ] `task-5-flow-connection.png` — Successful flow-to-flow connection
  - [ ] `task-5-flow-to-input-reject.png` — Rejected flow-to-input

  **Commit**: NO (evidence only)

- [ ] 6. QA — red hollow + regular hollow circle port visual + connection

  **What to do**:
  - Verify the complete red hollow circle and regular hollow circle port workflow: visual rendering, connection creation (input↔output), connection rejection (circle↔flow)
  - Use the running dev server with all Task 1-4 changes applied

  **Must NOT do**:
  - Do NOT make any code changes
  - Do NOT test triangle ports — that's Task 5

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Browser-based visual verification with Playwright
  - **Skills**: [`playwright`]
    - `playwright`: For browser automation, hover/click verification, and screenshot capture

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7 — after Task 4 completes)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References** (CRITICAL):
  **Pattern References**:
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:20-22` — Computed properties: `isFlow`, `isData`
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:396-427` — Template: all three rendering branches
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:597-603` — `.sp` (existing circle) CSS

  **WHY Each Reference Matters**:
  - You need correct CSS selectors for Playwright: `.rp` for red hollow circle, `.sp` for regular hollow circle
  - Understanding which port gets which class is critical for correct test assertions

  **Acceptance Criteria**:
  - [ ] Red hollow circle renders with red border (#f23433) and white background
  - [ ] Regular hollow circle renders with portColor-based styling
  - [ ] input-to-output connection created successfully
  - [ ] output-to-input connection created successfully
  - [ ] Circle-to-flow connection rejected

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Red hollow circle visual verification
    Tool: Playwright
    Preconditions: Dev server running, flow editor loaded, variable_set node on canvas (has portType='input' on left)
    Steps:
      1. Navigate to flow editor page
      2. Add variable_set node to canvas
      3. Locate red hollow circle: `page.locator('.rp').first()`
      4. Assert element has CSS `border-color: #f23433` or `border` contains `#f23433`
      5. Assert element has CSS `background-color` not equal to `#f23433` (should be hollow/white)
      6. Assert `border-radius: 50%`
      7. Screenshot the port
    Expected Result: Circle with red border, white center (hollow), circular shape
    Failure Indicators: No `.rp` class, solid red fill, square shape
    Evidence: .sisyphus/evidence/task-6-red-circle-visual.png

  Scenario: Red hollow circle connected state
    Tool: Playwright
    Preconditions: Two nodes connected: output(right) → input(left red circle)
    Steps:
      1. Create connection from output port (right) to input port (left red circle)
      2. Wait for connection (timeout: 2s)
      3. Locate the connected red circle port
      4. Assert the connected class is applied (`.rp-connected`)
      5. Assert background-color changes to red (#f23433) — filled when connected
      6. Screenshot
    Expected Result: Red hollow circle fills with red when connected
    Failure Indicators: No visual change on connection, wrong class applied
    Evidence: .sisyphus/evidence/task-6-red-circle-connected.png

  Scenario: input-to-output connection success
    Tool: Playwright
    Preconditions: Two nodes: one with output(right), one with input(left)
    Steps:
      1. Add variable_get node (output port on right)
      2. Add variable_set node (input port on left)
      3. Drag from output right circle to input left red circle
      4. Assert connection line created
      5. Screenshot
    Expected Result: Connection between output and input ports
    Evidence: .sisyphus/evidence/task-6-input-output-connection.png

  Scenario: Circle-to-flow rejection
    Tool: Playwright
    Preconditions: Node with circle port + node with flow port
    Steps:
      1. Drag from output circle port (right) to flow triangle port (left)
      2. Assert ElMessage error appears
      3. Assert no connection line
    Expected Result: Connection rejected with error
    Evidence: .sisyphus/evidence/task-6-circle-to-flow-reject.png
  ```

  **Evidence to Capture**:
  - [ ] `task-6-red-circle-visual.png` — Red hollow circle visual
  - [ ] `task-6-red-circle-connected.png` — Red hollow circle connected (filled)
  - [ ] `task-6-input-output-connection.png` — Successful input-output connection
  - [ ] `task-6-circle-to-flow-reject.png` — Rejected circle-to-flow

  **Commit**: NO (evidence only)

- [ ] 7. QA — cross-type rejection + connection line positioning

  **What to do**:
  - Verify ALL cross-type rejection cases work correctly (comprehensive test of checkConnectingPorts)
  - Verify connection line positioning is now correct (anchored at port visual center)
  - This is the integration QA — tests the validation logic (Task 4) and anchor fix (Task 3) together

  **Must NOT do**:
  - Do NOT make any code changes — verification only

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Comprehensive browser-based QA with Playwright
  - **Skills**: [`playwright`]
    - `playwright`: For all browser interaction and screenshot capture

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6 — after Task 4 completes)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 2, 3, 4

  **References** (CRITICAL):
  **Pattern References**:
  - `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue:153-274` — Full validation function to understand all rejection cases
  - `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue:149` — Anchor y formula (verify positioning)
  - `apps/web-ele/src/views/processManage/components/flow/FlowNode.vue:139` — Anchor x values: `pos === 'left' ? 0.05 : 0.95`

  **WHY Each Reference Matters**:
  - Understanding all rejection cases ensures comprehensive coverage
  - The anchor formula determines whether the line positioning test passes or fails

  **Acceptance Criteria**:
  - [ ] flow↔input rejected (both directions)
  - [ ] flow↔output rejected (both directions)
  - [ ] Duplicate connection rejected
  - [ ] Same-node connection rejected
  - [ ] Connection line starts at right-center of source port
  - [ ] Connection line ends at left-center of target port
  - [ ] Multiple ports on same node have individually correct anchor positions

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: All cross-type rejections comprehensive
    Tool: Playwright
    Preconditions: Dev server running, all 3 port types available on canvas
    Steps:
      1. Test flow → input: assert rejected with ElMessage
      2. Test flow → output: assert rejected with ElMessage
      3. Test input → flow: assert rejected with ElMessage
      4. Test output → flow: assert rejected with ElMessage
      5. For each: screenshot showing the error message visible
    Expected Result: All 4 cross-type attempts rejected with appropriate messages
    Failure Indicators: Any cross-type connection succeeds
    Evidence: .sisyphus/evidence/task-7-cross-type-all.png

  Scenario: Connection line position accuracy
    Tool: Playwright
    Preconditions: Two nodes connected on canvas
    Steps:
      1. Create a connection between two nodes (any valid type)
      2. Locate the SVG path element for the connection
      3. Get the `d` attribute of the SVG path to find the start/end coordinates
      4. Verify the start point is near the right edge of the source node
      5. Verify the end point is near the left edge of the target node
      6. Screenshot the connected nodes with the line visible
    Expected Result: Line starts at right edge center of source port, ends at left edge center of target port
    Failure Indicators: Line clearly starts/ends away from port positions
    Evidence: .sisyphus/evidence/task-7-line-position-accuracy.png

  Scenario: Multiple ports positioning on same node
    Tool: Playwright
    Preconditions: A node with 2+ left ports and 2 different connections targeting different ports
    Steps:
      1. Create a node with multiple left ports (e.g., variable_set: flow + input)
      2. Connect from two different right-side nodes to each left port
      3. Screenshot showing both connections landing at distinct vertical positions
      4. Verify connections don't overlap — each targets its own port
    Expected Result: Two distinct connection lines ending at different heights on the same node
    Failure Indicators: Both lines converge to same spot, visually overlapping
    Evidence: .sisyphus/evidence/task-7-multi-port-distinct.png
  ```

  **Evidence to Capture**:
  - [ ] `task-7-cross-type-all.png` — All cross-type rejections
  - [ ] `task-7-line-position-accuracy.png` — Connection line position verification
  - [ ] `task-7-multi-port-distinct.png` — Multiple ports distinct positioning

  **Commit**: NO (evidence only)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Review all changed files for: unused imports, console.log in non-debug paths, incorrect CSS. Check that existing form input logic, drag/zoom, and context menus are intact.
  Output: `Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean dev server state. Execute EVERY QA scenario from Tasks 5, 6, 7. Test cross-task integration: add nodes, create all connection types, verify rejections, verify line positions. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", compare with actual diff. Verify no unaccounted changes. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **T1**: `style(flow): add three port type visual styles` — `FlowPort.vue`
- **T2**: `fix(flow): use portType-based color assignment` — `FlowArea.vue`
- **T3**: `fix(flow): correct anchor y-position alignment` — `FlowNode.vue`
- **T4**: `fix(flow): enforce portType-based connection validation` — `FlowPort.vue`

---

## Success Criteria

### Verification Commands
```bash
# Start dev server
pnpm dev
# Navigate browser to flow editor page
# Verify all QA scenarios pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All 4 implementation tasks complete with evidence
