# Visual 迁移修复计划

## TL;DR

> **Quick Summary**: 修复从 Vue 2 (cloud_phone_web) 迁移到 Vue 3 (callfans-platform-admin) 的 Visual 流程编辑器中的 22 个功能遗漏和逻辑缺陷，恢复数据加载/保存/运行能力，修复撤销重做系统，补全缺失的 UI 子组件和交互。
>
> **Deliverables**:
> - 修复后的 Pinia store（撤销/重做 + 自动保存链路）
> - 对接后端 API 的数据加载、保存、运行功能
> - 恢复的子流程支持、连线右键菜单、自定义表单组件
> - 统一的 jsPlumb 配置
> - 代码结构验证通过（无语法错误、标签闭合）
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 6 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 14 → F1-F2

---

## Context

### Original Request
对从 `cloud_phone_web` (Vue 2) 迁移到 `callfans-platform-admin` (Vue 3) 的 Visual.vue 流程编辑器页面进行全面对比测试后发现 22 个功能遗漏/逻辑错误/显示异常，需全部修复。

### Interview Summary
**Key Discussions**:
- 修复范围：全部 22 个问题，按 P0→P6→P9→P11 优先级逐步推进
- 测试策略：不需要功能测试，但基础代码结构需验证（语法、标签闭合、TS 类型错误等）
- API 对接：有后端可用，使用真实 API 对接（参照 cloud_phone_web 原版 API 调用模式）

**Research Findings**:
- 两项目均使用 jsPlumb 2.x，但配置参数有差异（curviness、箭头、悬停颜色）
- 原版使用 form-create 动态表单库，迁移版使用手动 el-form——大部分等价但缺少 panel-parameter/input-group/select-group
- 原版 Vuex store 的 popFlowStack mutation 含精密 deepClone + 节点 diff + jsPlumb 增量重连逻辑

### Metis Review
> Metis 调用超时，直接基于 11 个维度的完整对比分析生成计划。

---

## Work Objectives

### Core Objective
修复 Visual 流程编辑器迁移后的 22 个问题，使迁移版功能与原版完全一致。

### Concrete Deliverables
- `apps/web-ele/src/store/modules/processVisual.ts` — 恢复撤销/重做 + 自动保存链路
- `apps/web-ele/src/views/processManage/components/AppMain.vue` — 恢复数据加载 + 子流程 + EventBus
- `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue` — 修复 beforeDrop + 链接右键菜单 + paste 来源
- `apps/web-ele/src/views/processManage/components/flow/FlowPort.vue` — 恢复 choicesUrl + 数字验证 + 坐标联动
- `apps/web-ele/src/views/processManage/components/DetailPanel.vue` — 恢复 panel-parameter + input-group + provide
- `apps/web-ele/src/views/processManage/components/Save.vue` — 对接真实 API + 恢复自动保存触发链
- `apps/web-ele/src/views/processManage/components/RunTest.vue` — 恢复设备搜索 + 分页 + 真实 API
- `apps/web-ele/src/views/processManage/components/ConsolePanel.vue` — 恢复日志轮询 + 设备投屏
- `apps/web-ele/src/views/processManage/components/Sidebar.vue` — 统一折叠宽度
- `apps/web-ele/src/views/processManage/Visual.vue` — EventBus 通道 + Python 编辑器 + 路由响应式
- `apps/web-ele/src/views/processManage/components/flow/useJsPlumb.ts` — 统一 jsPlumb 配置
- `apps/web-ele/src/views/processManage/jsplumbConfig.ts` — 统一 jsPlumb 配置

### Definition of Done
- [ ] `pnpm build` 无语法/类型错误
- [ ] `pnpm lint` 无警告
- [ ] 撤销/重做链路完整（flowStack push → pop → jsPlumb 重连）
- [ ] Save 组件点击后真实调用后端 API
- [ ] 右键菜单全部恢复

### Must Have
- 撤销/重做系统完全恢复
- 流程加载/保存 API 对接
- 自动保存触发链路恢复
- beforeDrop 连线校验恢复正常
- 连线右键菜单恢复
- choicesUrl 参数替换恢复
- 代码构建无错误

### Must NOT Have (Guardrails)
- 不引入新的 UI 库（保持 Element Plus + jsPlumb）
- 不修改节点/端口数据结构（保持与原版兼容）
- 不改变画布交互的核心行为
- 不在修复过程中引入新 bug（每个修复需 local 验证）
- 不对已有正常功能做"过度优化"

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO dedicated test framework for this module
- **Automated tests**: None required
- **Framework**: N/A
- **Code Structure Validation (MANDATORY)**: 每个任务完成后执行 `pnpm build` + `tsc --noEmit` + `pnpm lint` 验证代码结构完整性（语法、标签闭合、TS 类型正确）

### QA Policy
每个任务完成后执行结构验证。Evidence 保存到 `.sisyphus/evidence/task-{N}-validation.txt`。

- **Code Structure**: Run `pnpm build`（检查语法 + 标签闭合）、`tsc --noEmit`（检查 TS 类型）
- **Runtime Sanity**: 启动 dev server 后通过 Playwright 验证页面正常加载无白屏

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - Store fixes):
├── Task 1: Store 撤销/重做修复 [deep]
└── Task 2: Store 自动保存链路修复 [quick]

Wave 2 (Core API Integration - depends Wave 1):
├── Task 3: 流程数据加载 API 对接 [deep]
├── Task 4: 流程保存 API 对接 [deep]
└── Task 5: 运行测试 API 对接 [deep]

Wave 3 (Connection System - depends Wave 1):
├── Task 6: beforeDrop 连线校验修复 [quick]
├── Task 7: choicesUrl 参数替换恢复 [quick]
└── Task 8: 端口表单数字验证恢复 [quick]

Wave 4 (UI Components - depends Wave 1):
├── Task 9: 连线右键菜单恢复 [deep]
├── Task 10: DetailPanel 自定义组件恢复 [deep]
└── Task 11: DetailPanel provide/inject 恢复 [quick]

Wave 5 (Extra Features - depends Wave 2,4):
├── Task 12: 子流程 fcid 支持恢复 [deep]
├── Task 13: ConsolePanel 日志轮询恢复 [deep]
└── Task 14: RunTest 设备搜索 + 分页恢复 [unspecified-high]

Wave 6 (Polish):
├── Task 15: jsPlumb 配置统一 [quick]
├── Task 16: 侧栏/面板折叠宽度统一 [quick]
├── Task 17: Python 编辑器升级 [deep]
├── Task 18: EventBus 通道恢复 [quick]
├── Task 19: 坐标联动 + debounce + 路由响应式 [quick]
└── Task 20: 全局代码结构验证 [quick]

Wave FINAL:
├── Task F1: 构建验证 (pnpm build + tsc --noEmit)
├── Task F2: Lint 验证 (pnpm lint)
└── Task F3: 功能完整性核对
```

**Critical Path**: Task 1 → Task 3 → Task 5 → Task 14 → F1-F2

### Dependency Matrix

- **1-2**: - - 3-11
- **3-5**: 1 - 12-14
- **6-8**: 1 - -
- **9-11**: 1 - 12
- **12**: 3, 9 - -
- **13-14**: 3, 5 - -
- **15-20**: 1 - F1-F3
- **F1-F3**: ALL - -

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1→`deep`, T2→`quick`
- **Wave 2**: 3 tasks — T3→`deep`, T4→`deep`, T5→`deep`
- **Wave 3**: 3 tasks — T6-T8→`quick`
- **Wave 4**: 3 tasks — T9→`deep`, T10→`deep`, T11→`quick`
- **Wave 5**: 3 tasks — T12→`deep`, T13→`deep`, T14→`unspecified-high`
- **Wave 6**: 6 tasks — T15-T16→`quick`, T17→`deep`, T18-T19→`quick`, T20→`quick`
- **FINAL**: 3 tasks — F1-F3→`quick`

---

## TODOs

- [ ] 1. Store 撤销/重做修复

  **What to do**:
  - 在 `processVisual.ts` 的 `setNodeOperation` 方法中添加 flowStack push 逻辑：
    - 当 `flow.value.id` 非空时，将当前 `{ flow, nodeList: deepClone, linkList: deepClone, variables: deepClone }` push 到 `flowStack`
    - 栈深度限制 15 条
  - 重写 `popFlowStack`：从栈中取出最后一条记录 → deepClone 恢复 nodeList/linkList/variables → 对比新旧 nodeList 找出差异节点 → 对删除的节点调用 `plumb.remove()` → 对新增节点在恢复后调用 `plumb.connect()` 重连
  - 同步修复 `popBackFlowStack`（重做）
  - 实现 deepClone 工具函数（或使用 `structuredClone` / `JSON.parse(JSON.stringify())`）

  **Must NOT do**:
  - 不要修改 flowStack 的数据结构格式
  - 不要改动其他 store 方法

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及复杂的 Store 逻辑重写，需要理解撤销栈的状态管理和 jsPlumb 同步
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3-20
  - **Blocked By**: None

  **References**:
  - `D:\project\cloud_phone_web\src\store\index.js:130-245` — 原版 `popFlowStack` / `popBackFlowStack` 完整实现（含 deepClone、节点 diff、jsPlumb 增量重连逻辑）
  - `D:\project\cloud_phone_web\src\store\index.js:252-270` — 原版 `setNodeOperation` 中 push flowStack + autoSaveStack 的逻辑
  - `D:\project\callfans-platform-admin\apps\web-ele\src\store\modules\processVisual.ts:243-265` — 当前简化版 `popFlowStack` / `pushFlowStack`

  **Acceptance Criteria**:
  - [ ] `setNodeOperation` 调用后 flowStack 长度 +1
  - [ ] `popFlowStack` 能恢复 nodeList / linkList / variables
  - [ ] 恢复后 jsPlumb 连线正确渲染

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 添加节点后撤销
    Tool: Bash (tsc --noEmit) + Bash (pnpm build)
    Preconditions: store 修改完成
    Steps:
      1. 运行 `cd apps/web-ele && npx tsc --noEmit`
      2. 运行 `cd apps/web-ele && pnpm build`
    Expected Result: tsc 无类型错误，build 成功
    Failure Indicators: TypeScript 编译错误或 build 失败
    Evidence: .sisyphus/evidence/task-1-validation.txt

  Scenario: 检测代码结构完整性
    Tool: Bash (grep)
    Steps:
      1. 在 processVisual.ts 中搜索未闭合的括号：`grep -c "{" apps/web-ele/src/store/modules/processVisual.ts` 和 `grep -c "}" apps/web-ele/src/store/modules/processVisual.ts`
      2. 确认数量匹配
    Expected Result: 左右括号数量一致
    Evidence: .sisyphus/evidence/task-1-brackets.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `fix(store): restore undo/redo and auto-save chain`
  - Files: `apps/web-ele/src/store/modules/processVisual.ts`

- [ ] 2. Store 自动保存链路修复

  **What to do**:
  - 在 `setNodeOperation` 中恢复 `autoSaveStack.push(Date.now())` 逻辑（见原版 store/index.js:267-268）
  - 确认 `Save.vue` 中 `watch autoSaveStack.length` 能正确触发 `handleSave()`
  - 确保 `handleSave` 调用真实 API 后调用 `clearAutoSaveStack()`

  **Must NOT do**:
  - 不要改动 Save.vue 的 watch autoSaveStack 逻辑（它已存在）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件、单方法修改，逻辑简单
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None directly
  - **Blocked By**: None

  **References**:
  - `D:\project\cloud_phone_web\src\store\index.js:267-268` — 原版 `autoSaveStack.push(new Date().getTime())`
  - `D:\project\callfans-platform-admin\apps\web-ele\src\store\modules\processVisual.ts:238-241` — `clearAutoSaveStack` 方法
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\Save.vue:60-68` — watch autoSaveStack 逻辑

  **Acceptance Criteria**:
  - [ ] `setNodeOperation` 调用后 autoSaveStack 非空
  - [ ] watch 能触发 `handleSave()`

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 自动保存链路完整性检查
    Tool: Bash (grep)
    Steps:
      1. 搜索 `autoSaveStack` 在 store 中的 push 调用: `grep -n "autoSaveStack" apps/web-ele/src/store/modules/processVisual.ts`
    Expected Result: 找到 push 调用（非仅定义和 clear）
    Evidence: .sisyphus/evidence/task-2-autosave.txt
  ```

  **Commit**: YES (groups with Task 1)

- [ ] 3. 流程数据加载 API 对接

  **What to do**:
  - 在 `AppMain.vue` 的 `getFlowData(fid)` 方法中恢复 API 调用：
    - 调用 API 获取流程数据（接口格式参照原版 `$api.process.query(fid)`）
    - 解析返回的 `data.flow` → 提取 `allFlow.main` → 恢复 nodeList / linkList / variables
    - 恢复子流程 `fcid` 参数支持（Task 12 中完成，此处预留接口）
    - 加载完成后恢复连线（遍历 linkList 调用 drawLink）
  - 在 `Visual.vue` 的 `getProcessInfo()` 中恢复 API 调用，获取 processType 和 processInfo
  - 在 `AppMain.vue` 的 `mounted` 中确保流程数据正确初始化

  **Must NOT do**:
  - 不创建新的 API 文件——使用已有 `apps/web-ele/src/api/core/processManage.ts` 或新建方法
  - 不改变 nodeList/linkList/variables 的数据结构

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及多文件间的 API 对接和数据流恢复，需要理解完整的数据加载链路
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Tasks 12, 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:166-246` — 原版 `getFlowData()` 完整实现
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\AppMain.vue:59-76` — 当前 TODO 版本
  - `D:\project\callfans-platform-admin\apps\web-ele\src\api\core\processManage.ts` — 已有 API 文件
  - `D:\project\cloud_phone_web\src\views\visual\Visual.vue:162-171` — 原版 getProcessInfo

  **Acceptance Criteria**:
  - [ ] `getFlowData(fid)` 能通过 API 获取并恢复 nodeList / linkList / variables
  - [ ] 加载后画布正确显示节点和连线
  - [ ] `pnpm build` 无错误

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `cd apps/web-ele && pnpm build`
    Expected Result: 无类型错误，build 成功
    Evidence: .sisyphus/evidence/task-3-validation.txt
  ```

  **Commit**: YES (groups with Tasks 4, 5)
  - Message: `feat(visual): integrate backend API for load/save/run`
  - Files: `apps/web-ele/src/views/processManage/components/AppMain.vue`, `apps/web-ele/src/api/core/processManage.ts`

- [ ] 4. 流程保存 API 对接

  **What to do**:
  - 在 `Save.vue` 的 `handleSave()` 中替换 `setTimeout` 为真实 API 调用
  - 参照原版 Save.vue 的数据组装逻辑：`allFlow[key] = { id, nodeList, linkList }` + `allFlow.main.variables`
  - 添加 API 方法到 `processManage.ts`（如 `saveProcess(data)`）
  - 确保保存成功后显示 ElMessage.success，失败显示 ElMessage.error
  - 保持 Auto-save 的 watch 链路完整

  **Must NOT do**:
  - 不改变 Save.vue 的 UI 交互（loading 动画、success icon 等）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 涉及 API 对接和数据组装
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\navbar\save\Save.vue:70-121` — 原版 `onSave()` 完整实现
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\Save.vue:24-57` — 当前 TODO 版本

  **Acceptance Criteria**:
  - [ ] 点击保存后调用真实 API
  - [ ] 保存成功后显示"保存成功"提示
  - [ ] 保存失败后显示"保存失败"提示

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
    Expected Result: 无类型错误
    Evidence: .sisyphus/evidence/task-4-validation.txt
  ```

  **Commit**: YES (groups with Tasks 3, 5)

- [ ] 5. 运行测试 API 对接

  **What to do**:
  - 在 `RunTest.vue` 的 `handleConfirm()` 中替换 mock 为真实 API 调用
  - 恢复设备列表获取 API（原版 `$api.device.list`）
  - 恢复执行 API（原版 `$api.process.execute`）
  - 执行成功后调用 `store.setJobId` 和 `store.setJobPhoneId`
  - 添加对应的 API 方法到 `processManage.ts`

  **Must NOT do**:
  - 不改变 RunTest.vue 的 UI 结构

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 真实 API 对接 + 设备列表获取
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\process\test\test.vue:113-147` — 原版 confirm() 执行逻辑
  - `D:\project\cloud_phone_web\src\views\process\test\test.vue:162-189` — 原版 getPhoneList()
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\RunTest.vue:50-66` — 当前 TODO 版本

  **Acceptance Criteria**:
  - [ ] 设备列表从 API 加载
  - [ ] 运行按钮触发 API 执行
  - [ ] 成功后 setJobId

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `cd apps/web-ele && pnpm build`
    Expected Result: 无错误
    Evidence: .sisyphus/evidence/task-5-validation.txt
  ```

  **Commit**: YES (groups with Tasks 3, 4)

- [ ] 6. beforeDrop 连线校验修复

  **What to do**:
  - 在 `FlowArea.vue` 的 `initJsPlumb()` 中，将 `beforeDrop` 回调从始终返回 `false` 改为合理校验逻辑
  - 参照原版 `VisualAppMain.vue:321-336` 的逻辑：检查同节点连接 + 同方向重复连线
  - 将连接校验的实际逻辑保留在 FlowPort.vue 的 `checkConnectingPorts` 中（不重复实现）
  - 在 `beforeDrop` 中返回 `true` 允许 jsPlumb 完成连接事件

  **Must NOT do**:
  - 不要删除 FlowPort.vue 中的 checkConnectingPorts 六步校验

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件单方法修复，逻辑简单
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:321-336` — 原版 beforeDrop
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\flow\FlowArea.vue:74-77` — 当前始终返回 false 的 beforeDrop
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\flow\FlowPort.vue:159-293` — checkConnectingPorts 六步校验

  **Acceptance Criteria**:
  - [ ] 正常连线（不同节点、不同侧、不重复）成功创建
  - [ ] 同节点连线被拒绝
  - [ ] 重复连线被拒绝

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证 + 关键逻辑检查
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `grep -n "return false" apps/web-ele/src/views/processManage/components/flow/FlowArea.vue | grep -i "beforedrop"`
    Expected Result: beforeDrop 的 return false 已被替换为 return true
    Evidence: .sisyphus/evidence/task-6-validation.txt
  ```

  **Commit**: YES (groups with Tasks 7, 8)
  - Message: `fix(visual): restore connection validation and port form logic`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue`

- [ ] 7. choicesUrl 参数替换恢复

  **What to do**:
  - 在 `FlowPort.vue` 的 `getChoices()` 方法中，恢复 `{process_id}` 参数替换逻辑
  - 参照原版：从 URL 中提取 `fid` 参数，替换 choicesUrl 中的 `{process_id}` 占位符
  - 确保 `choicesUrl` 和 `choicesList` 的处理逻辑与原版一致

  **Must NOT do**:
  - 不改变 fetch 调用的基础结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单方法修复
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 8)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\main\port\Flow-port.vue:153-174` — 原版 getChoices
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\flow\FlowPort.vue:50-70` — 当前版本

  **Acceptance Criteria**:
  - [ ] choicesUrl 中的 `{process_id}` 被正确替换为当前 fid

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 代码逻辑检查
    Tool: Bash (grep)
    Steps:
      1. `grep -n "process_id\|fid" apps/web-ele/src/views/processManage/components/flow/FlowPort.vue`
    Expected Result: 找到 process_id 替换逻辑
    Evidence: .sisyphus/evidence/task-7-choices.txt
  ```

  **Commit**: YES (groups with Tasks 6, 8)

- [ ] 8. 端口表单数字验证恢复

  **What to do**:
  - 在 `FlowPort.vue` 的 `onFormChange()` 或 `uploadNormalPort` 等效逻辑中，添加数字格式验证
  - 当 `port.dataType === 'number'` 时，用正则校验值格式：`/^[+-]?\d*(\.\d*)?(e[+-]?\d+)?$/`
  - 校验失败时 return（不更新 store）

  **Must NOT do**:
  - 不要影响其他 dataType 的表单提交

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单处正则校验添加
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 6, 7)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\main\port\Flow-port.vue:413-415` — 原版数字验证
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\flow\FlowPort.vue:92-118` — 当前 onFormChange

  **Acceptance Criteria**:
  - [ ] number 类型端口输入非法字符时，值不被保存

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 数字验证代码存在性检查
    Tool: Bash (grep)
    Steps:
      1. `grep -n "dataType.*number\|number.*test\|number.*regex" apps/web-ele/src/views/processManage/components/flow/FlowPort.vue`
    Expected Result: 找到数字格式校验逻辑
    Evidence: .sisyphus/evidence/task-8-number.txt
  ```

  **Commit**: YES (groups with Tasks 6, 8)

- [ ] 9. 连线右键菜单恢复

  **What to do**:
  - 在 `FlowArea.vue` 中添加连线右键的功能：
    - 在 jsPlumb `contextmenu` 回调中，记录当前右键的连线信息（connInfo）
    - 添加一个 ContextMenu 实例用于连线操作（"删除连线"选项）
    - 删除连线时通过 jsPlumb API 移除，并从 linkList 中移除
  - 参照原版 VisualAppMain.vue 中的 `lineContextMenuData` + `deleteLine()` 逻辑

  **Must NOT do**:
  - 不要影响现有的节点右键菜单和画布右键菜单

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要在 FlowArea 中新增 ContextMenu 实例 + jsPlumb 事件绑定
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 10, 11)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:358-361` — 原版 contextmenu 事件
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:98-111` — 原版 lineContextMenuData
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:379-418` — 原版 deleteLine()
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\flow\FlowArea.vue:104-106` — 当前 contextmenu 回调（仅存留）

  **Acceptance Criteria**:
  - [ ] 右键连线时弹出"删除连线"菜单
  - [ ] 点击删除后连线从 canvas 和 linkList 中移除

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证 + 菜单代码存在性
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `grep -n "line-menu\|lineContextMenu\|deleteLine\|connInfo" apps/web-ele/src/views/processManage/components/flow/FlowArea.vue`
    Expected Result: 找到连线菜单相关代码
    Evidence: .sisyphus/evidence/task-9-validation.txt
  ```

  **Commit**: YES (groups with Tasks 10, 11)
  - Message: `fix(visual): restore context menu and detail panel components`
  - Files: `apps/web-ele/src/views/processManage/components/flow/FlowArea.vue`

- [ ] 10. DetailPanel 自定义组件恢复

  **What to do**:
  - 在 `DetailPanel.vue` 中恢复缺失的 form 渲染分支：
    - `panel-parameter`：创建 PanelParameter.vue 子组件（显示坐标/元素信息，可点击触发元素捕获）
    - `my-input-group`：创建 InputGroup.vue 子组件（array 类型的动态输入组，支持添加/删除行）
    - `my-select-group`：创建 SelectGroup.vue 子组件（array dataType 的 select 多选组）
    - `my-md-textarea`：创建 MdTextarea.vue 子组件（支持 Python/JS 代码高亮的编辑器）
  - 在 `getRenderType()` 方法中添加对应的渲染类型映射

  **Must NOT do**:
  - 不要引入新的第三方库
  - 不要改动已有正常工作的 form 渲染分支

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要创建 4 个新的 Vue 子组件 + 修改 DetailPanel 的分发逻辑
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 9, 11)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\detail-panel\Detail-panel.vue:411-421` — 原版 getPanelOther（panel-parameter）
  - `D:\project\cloud_phone_web\src\views\detail-panel\Detail-panel.vue:258-268` — 原版 array input-group
  - `D:\project\cloud_phone_web\src\views\detail-panel\Detail-panel.vue:230-255` — 原版 array select-group
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\DetailPanel.vue:58-80` — 当前 transformFormDatas

  **Acceptance Criteria**:
  - [ ] panel-parameter 组件正常渲染
  - [ ] input-group 组件支持动态添加/删除行
  - [ ] select-group 组件支持多选
  - [ ] md-textarea 组件支持代码输入

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `cd apps/web-ele && pnpm build`
    Expected Result: 无错误，新组件被正确引用
    Evidence: .sisyphus/evidence/task-10-validation.txt
  ```

  **Commit**: YES (groups with Tasks 9, 11)

- [ ] 11. DetailPanel provide/inject 恢复

  **What to do**:
  - 在 `DetailPanel.vue` 中添加 `provide()` 传递上下文：
    - `variableId`：当前编辑的变量 ID
    - `scope`：作用域（flow/gFlow）
    - `size`：表单控件尺寸
  - 确保子组件（VariablePanel、VariableNodePanel、InputGroup 等）可通过 `inject` 获取这些值

  **Must NOT do**:
  - 不要修改已有组件的 props 接口

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 添加 provide + 确保子组件 inject 可用
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 9, 10)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\detail-panel\Detail-panel.vue:111-115` — 原版 provide
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\DetailPanel.vue` — 当前无 provide

  **Acceptance Criteria**:
  - [ ] DetailPanel 通过 provide 传递 variableId 和 scope

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: provide 代码存在性
    Tool: Bash (grep)
    Steps:
      1. `grep -n "provide\|inject" apps/web-ele/src/views/processManage/components/DetailPanel.vue`
    Expected Result: 找到 provide 调用
    Evidence: .sisyphus/evidence/task-11-provide.txt
  ```

  **Commit**: YES (groups with Tasks 9, 10)

- [ ] 12. 子流程 fcid 支持恢复

  **What to do**:
  - 在 `AppMain.vue` 的 `getFlowData()` 中恢复 `fcid` 参数支持：
    - 从路由 `this.$route.query.fcid` 读取子流程 ID
    - 当 `fcid` 存在时，从 `allFlow[fcid]` 加载子流程数据
    - 当 `fcid` 不存在时，加载 `allFlow.main`
  - 在画布状态切换时正确处理主流程/子流程的切换

  **Must NOT do**:
  - 不要改变数据加载的总体结构

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解子流程的完整数据流和加载逻辑
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 13, 14)
  - **Blocked By**: Tasks 3, 9

  **References**:
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:167-200` — 原版 fcid 处理逻辑
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\AppMain.vue:59-76` — 当前 getFlowData

  **Acceptance Criteria**:
  - [ ] 路由含 `fcid` 时加载对应子流程
  - [ ] `fcid` 不存在时加载主流程

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `cd apps/web-ele && pnpm build`
    Expected Result: 无错误
    Evidence: .sisyphus/evidence/task-12-validation.txt
  ```

  **Commit**: YES (groups with Tasks 13, 14)
  - Message: `feat(visual): restore subflow, console, device search`
  - Files: `apps/web-ele/src/views/processManage/components/AppMain.vue`

- [ ] 13. ConsolePanel 日志轮询恢复

  **What to do**:
  - 在 `ConsolePanel.vue` 中恢复日志轮询逻辑：
    - `startPolling()` 中使用真实 API `api.job.task_log({ task_id })` 每 5s 拉取日志
    - 恢复 `watch: jobId` 触发轮询
    - 恢复 `watch: flow` 切换流程时清空控制台
  - 添加对应的 API 方法

  **Must NOT do**:
  - 不引入 scrcpy 投屏（暂不恢复）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: API 对接 + watch 逻辑 + 轮询机制
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 12, 14)
  - **Blocked By**: Tasks 3, 5

  **References**:
  - `D:\project\cloud_phone_web\src\views\console\Console-panel.vue:130-157` — 原版 listLogfile
  - `D:\project\cloud_phone_web\src\views\console\Console-panel.vue:168-197` — 原版 watch jobId + flow
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\ConsolePanel.vue:32-55` — 当前 TODO 版本

  **Acceptance Criteria**:
  - [ ] jobId 变化时启动日志轮询
  - [ ] flow 切换时清空控制台
  - [ ] 轮询间隔 5s

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
    Expected Result: 无类型错误
    Evidence: .sisyphus/evidence/task-13-validation.txt
  ```

  **Commit**: YES (groups with Tasks 12, 14)

- [ ] 14. RunTest 设备搜索 + 分页恢复

  **What to do**:
  - 在 `RunTest.vue` 中恢复设备搜索和滚动分页功能：
    - `phoneSearch()`：输入搜索关键词时重置页码并重新加载
    - `phonePopupScroll()`：滚动到底部时自动加载下一页
    - `getPhoneList()`：使用真实 API 带分页参数加载设备列表
  - 调整模板中的 el-select 以支持远程搜索 + 下拉滚动事件

  **Must NOT do**:
  - 不改变 RunTest.vue 的整体弹窗结构

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 中等复杂度的列表交互功能
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 12, 13)
  - **Blocked By**: Tasks 3, 5

  **References**:
  - `D:\project\cloud_phone_web\src\views\process\test\test.vue:148-189` — 原版搜索 + 分页
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\RunTest.vue:36-48` — 当前简化版

  **Acceptance Criteria**:
  - [ ] 支持输入关键字远程搜索设备
  - [ ] 下拉滚动加载更多设备
  - [ ] 分页参数正确

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `cd apps/web-ele && pnpm build`
    Expected Result: 无错误
    Evidence: .sisyphus/evidence/task-14-validation.txt
  ```

  **Commit**: YES (groups with Tasks 12, 14)

- [ ] 15. jsPlumb 配置统一

  **What to do**:
  - 统一 `jsplumbConfig.ts` 和 `useJsPlumb.ts` 中的配置参数，确保一致：
    - 贝塞尔曲线 curviness：150（与 cloud_phone_web 原版一致）
    - HoverPaintStyle：stroke `#176ac5`，strokeWidth 3
    - 连线端点箭头：使用 `connectionOverlays: [Arrow, { location:1, width:10, length:10 }]`
    - 合并两个文件中的重复配置，以 `jsplumbConfig.ts` 为唯一配置来源
  - 确保 `useJsPlumb.ts` 引用 `jsplumbConfig.ts` 的配置而非重复定义

  **Must NOT do**:
  - 不删除 useJsPlumb.ts 文件（可能有其他引用）
  - 不改变连线的核心渲染行为

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 配置参数调整
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 16-20)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\main\area\Flow-area.vue` — 原版使用 `this.jsplumbConnectOptions`（通过 easyFlowMixin）
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\jsplumbConfig.ts` — 配置 A
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\flow\useJsPlumb.ts` — 配置 B（存在重复和不一致）

  **Acceptance Criteria**:
  - [ ] curviness 统一为 150
  - [ ] 连线末端有三角箭头
  - [ ] 两文件无重复配置

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 配置一致性检查
    Tool: Bash (grep)
    Steps:
      1. `grep -n "curviness" apps/web-ele/src/views/processManage/jsplumbConfig.ts apps/web-ele/src/views/processManage/components/flow/useJsPlumb.ts`
    Expected Result: 两处 curviness 值一致（均为 150 或在 useJsPlumb.ts 中引用 jsplumbConfig.ts）
    Evidence: .sisyphus/evidence/task-15-config.txt
  ```

  **Commit**: YES (groups with Tasks 16-20)
  - Message: `fix(visual): unify config, polish UI details`
  - Files: `apps/web-ele/src/views/processManage/jsplumbConfig.ts`, `apps/web-ele/src/views/processManage/components/flow/useJsPlumb.ts`

- [ ] 16. 侧栏/面板折叠宽度统一

  **What to do**:
  - 将 `Visual.vue` 中侧边栏和细节面板的折叠宽度从 20px 改为 0px（与原版 `:collapsedWidth="0"` 一致）
  - 将 `Sidebar.vue` 和 `DetailPanel.vue` 中的折叠/展开按钮逻辑调整为：折叠时完全隐藏，仅通过 hover 显示展开按钮

  **Must NOT do**:
  - 不要移除折叠/展开功能

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS 宽度值调整 + 简单的显隐逻辑
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 15-20)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\visual\Visual.vue:25-27` — 原版 `:collapsedWidth="0"`
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\Visual.vue:152-167` — 当前 `:width="variableCollapse ? '20px' : '260px'"`

  **Acceptance Criteria**:
  - [ ] 折叠时侧栏宽度为 0
  - [ ] 折叠时细节面板宽度为 0
  - [ ] 展开/折叠功能正常

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 折叠宽度值检查
    Tool: Bash (grep)
    Steps:
      1. `grep -n "20px\|collapsedWidth\|variableCollapse\|panelCollapse" apps/web-ele/src/views/processManage/Visual.vue`
    Expected Result: 折叠宽度为 0 或不再使用 20px
    Evidence: .sisyphus/evidence/task-16-collapse.txt
  ```

  **Commit**: YES (groups with Tasks 15-20)

- [ ] 17. Python 编辑器升级

  **What to do**:
  - 将 `AppMain.vue` 中的 `<textarea>` 替换为 CodeMirror 或 Monaco Editor 组件
  - 检查项目中是否已有可复用的代码编辑器组件（如 `src/components/codemirror/`）
  - 如果没有，安装 `@codemirror/state` + `@codemirror/view` + `@codemirror/lang-python` 等包
  - 支持 Python 语法高亮、行号、自动换行

  **Must NOT do**:
  - 不要改变 processType 的判断逻辑

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要集成或创建代码编辑器组件
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 15-20)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:4-8` — 原版 code-editor 组件引用
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\AppMain.vue:144-150` — 当前 textarea

  **Acceptance Criteria**:
  - [ ] Python 模式下显示代码编辑器（非纯文本框）
  - [ ] 支持语法高亮

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `cd apps/web-ele && pnpm build`
    Expected Result: 无错误
    Evidence: .sisyphus/evidence/task-17-validation.txt
  ```

  **Commit**: YES (groups with Tasks 15-20)

- [ ] 18. EventBus 通道恢复

  **What to do**:
  - 在项目中创建/使用事件总线机制（mitt 库或 provide/inject）
  - 恢复以下事件通道：
    - `variable-refresh`：变量刷新时触发 → AppMain 重新加载 Variables
    - `addNode`：外部通过事件总线添加节点 → FlowArea 的 addNode 方法
  - 在 AppMain.vue 中监听 `variable-refresh` 事件
  - 在 FlowArea.vue 中监听 `addNode` 事件

  **Must NOT do**:
  - 不引入 Vue 2 的 `$bus` 模式，使用 Vue 3 兼容方案（mitt）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 事件总线是简单的事件发布订阅
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 15-20)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\layout\components\VisualAppMain.vue:634-637` — 原版 $bus.$on("variable-refresh")
  - `D:\project\cloud_phone_web\src\views\main\area\Flow-area.vue:1087` — 原版 $EventBus.$on("addNode")

  **Acceptance Criteria**:
  - [ ] 通过 mitt 实现事件总线
  - [ ] variable-refresh 事件通道可用
  - [ ] addNode 事件通道可用

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证 + mitt 依赖
    Tool: Bash
    Steps:
      1. `grep -rn "mitt\|eventBus\|EventBus" apps/web-ele/src/views/processManage/`
      2. `cd apps/web-ele && npx tsc --noEmit`
    Expected Result: 找到事件总线代码，无类型错误
    Evidence: .sisyphus/evidence/task-18-eventbus.txt
  ```

  **Commit**: YES (groups with Tasks 15-20)

- [ ] 19. 坐标联动 + debounce + 路由响应式修复

  **What to do**:
  - 在 `FlowPort.vue` 中添加坐标联动逻辑：当端口 title 为 "X轴坐标"/"Y轴坐标" 时，同步更新 detailPanel 的"坐标"和"参数"字段
  - 统一 DetailPanel 中的 debounce 时间从 300ms 改为 100ms（与原版一致）
  - 在 `Visual.vue` 中添加 `watch: route.query.fid` 以支持路由参数变化时自动重新加载

  **Must NOT do**:
  - 不要改动流程的核心状态管理

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 三处小型代码修补
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 15-20)
  - **Blocked By**: Task 1

  **References**:
  - `D:\project\cloud_phone_web\src\views\main\port\Flow-port.vue:389-411` — 原版坐标联动
  - `D:\project\cloud_phone_web\src\views\detail-panel\Detail-panel.vue:466` — 原版 debounce 100ms
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\components\DetailPanel.vue:120` — 当前 debounce 300ms
  - `D:\project\callfans-platform-admin\apps\web-ele\src\views\processManage\Visual.vue:21-26` — 当前 fid ref 快照

  **Acceptance Criteria**:
  - [ ] 坐标端口变更时同步更新 detailPanel
  - [ ] DetailPanel debounce 为 100ms
  - [ ] 路由 fid 变化时自动重新加载

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
      2. `cd apps/web-ele && pnpm build`
    Expected Result: 无错误
    Evidence: .sisyphus/evidence/task-19-validation.txt
  ```

  **Commit**: YES (groups with Tasks 15-20)

- [ ] 20. 全局代码结构验证

  **What to do**:
  - 对修改的所有文件执行代码结构完整性检查：
    - 用 `grep` 统计每个文件中 `{` 和 `}` 数量是否匹配
    - 检查所有 `<template>` 标签是否都有对应的 `</template>` 闭合
    - 检查 `v-if`/`v-else` 配对是否完整
    - 移除所有残留的 `console.log` 调试语句（保留 `console.error`）
    - 检查 `import` 语句引用的路径是否存在

  **Must NOT do**:
  - 不要修改任何业务逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 全局搜索和结构检查
  - **Skills**: []
  - **Skills Evaluated but Omitted**: (none)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after all other tasks)
  - **Blocks**: F1-F3
  - **Blocked By**: Tasks 1-19

  **References**:
  - All modified files from Tasks 1-19

  **Acceptance Criteria**:
  - [ ] 所有文件括号匹配
  - [ ] 所有标签闭合
  - [ ] 无残留 console.log
  - [ ] 所有 import 路径有效

  **QA Scenarios (Agent-Executed)**:

  ```
  Scenario: 括号匹配检查
    Tool: Bash
    Steps:
      1. 对每个修改文件运行 `grep -c "{" file.vue` 和 `grep -c "}" file.vue`
    Expected Result: 数量一致
    Evidence: .sisyphus/evidence/task-20-brackets.txt

  Scenario: import 路径检查
    Tool: Bash
    Steps:
      1. `cd apps/web-ele && npx tsc --noEmit`
    Expected Result: 无 "Cannot find module" 错误
    Evidence: .sisyphus/evidence/task-20-imports.txt
  ```

  **Commit**: YES (groups with Tasks 15-20)
  - Message: `fix(visual): unify config, polish UI details`
  - Files: 所有修改文件

---

## Final Verification Wave

- [ ] F1. **构建验证** — `quick`
  Run `cd apps/web-ele && pnpm build` + `npx tsc --noEmit`. Verify zero errors.
  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL]`

- [ ] F2. **Lint 验证** — `quick`
  Run `cd apps/web-ele && pnpm lint`. Verify zero warnings.
  Output: `Lint [PASS/FAIL] - [N warnings]`

- [ ] F3. **功能完整性核对** — `quick`
  逐项核对 22 个修复项是否全部完成。检查每个修改文件是否有未闭合标签、注释残留、console.log 残留等基础问题。
  核对清单：Tasks 1-20 的 grep 证据文件是否存在，tsc 是否零错误。
  Output: `22/22 verified`

---

## Commit Strategy

- **1-2**: `fix(store): restore undo/redo and auto-save chain` — processVisual.ts
- **3-5**: `feat(visual): integrate backend API for load/save/run` — AppMain.vue, Save.vue, RunTest.vue, processManage.ts
- **6-8**: `fix(visual): restore connection validation and port form logic` — FlowPort.vue, FlowArea.vue
- **9-11**: `fix(visual): restore context menu and detail panel components` — FlowArea.vue, DetailPanel.vue, 新子组件
- **12-14**: `feat(visual): restore subflow, console, device search` — AppMain.vue, ConsolePanel.vue, RunTest.vue
- **15-20**: `fix(visual): unify config, polish UI details` — jsplumbConfig.ts, useJsPlumb.ts, Visual.vue, Sidebar.vue, FlowPort.vue, DetailPanel.vue

---

## Success Criteria

### Verification Commands
```bash
cd apps/web-ele && pnpm build    # Expected: exit 0, no errors
cd apps/web-ele && pnpm lint     # Expected: exit 0, 0 warnings
```

### Final Checklist
- [ ] 所有 22 个修复项已完成
- [ ] `pnpm build` 无错误
- [ ] `pnpm lint` 无警告
- [ ] 撤销/重做链路完整可用
- [ ] 流程保存/加载/运行可正常工作
- [ ] 连线系统功能完整

## Final Verification Wave

- [ ] F1. **构建验证** — `quick`
  Run `pnpm build` + `tsc --noEmit` on the web-ele app. Verify zero errors.
  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL]`

- [ ] F2. **Lint 验证** — `quick`
  Run `pnpm lint` on the web-ele app. Verify zero warnings.
  Output: `Lint [PASS/FAIL] - [N warnings]`

- [ ] F3. **功能完整性核对** — `quick`
  逐项核对 22 个修复项是否全部完成。检查每个修改文件是否有未闭合标签、注释残留、console.log 残留等基础问题。
  Output: `22/22 verified`

---

## Commit Strategy

- **1-2**: `fix(store): restore undo/redo and auto-save chain` — processVisual.ts
- **3-5**: `feat(visual): integrate backend API for load/save/run` — AppMain.vue, Save.vue, RunTest.vue
- **6-8**: `fix(visual): restore connection validation and port form logic` — FlowPort.vue, FlowArea.vue
- **9-11**: `fix(visual): restore context menu and detail panel components` — FlowArea.vue, DetailPanel.vue
- **12-14**: `feat(visual): restore subflow, console, device search` — AppMain.vue, ConsolePanel.vue, RunTest.vue
- **15-20**: `fix(visual): unify config, polish UI details` — jsplumbConfig.ts, Visual.vue, Sidebar.vue

---

## Success Criteria

### Verification Commands
```bash
cd apps/web-ele && pnpm build    # Expected: exit 0, no errors
cd apps/web-ele && pnpm lint     # Expected: exit 0, 0 warnings
```

### Final Checklist
- [ ] 所有 22 个修复项已完成
- [ ] `pnpm build` 无错误
- [ ] `pnpm lint` 无警告
- [ ] 撤销/重做链路完整可用
- [ ] 流程保存/加载/运行可正常工作
- [ ] 连线系统功能完整
