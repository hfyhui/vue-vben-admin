# Visual.vue — 流程编辑器详情页

## 一、页面概览

| 属性 | 值 |
|------|-----|
| 文件路径 | `apps/web-ele/src/views/processManage/Visual.vue` |
| 页面用途 | 可视化流程编辑器，用于拖拽式构建和配置 RPA-Mobile / Python 自动化流程 |
| 技术栈 | Vue 3 + Pinia + jsPlumb 2.x + Element Plus |
| 路由 | `/process-manage/visual?fid={flowId}` |

---

## 二、页面布局结构

```
┌─────────────────────────────────────────────────────────┐
│  Header (40px)                    [保存] [▶ 运行]       │
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│ Sidebar  │       AppMain (画布)          │ DetailPanel   │
│ (260px)  │   ┌──────────────────┐       │   (320px)     │
│          │   │   FlowArea       │       │               │
│ 节点列表  │   │  ┌────┐ ┌────┐  │       │  节点/变量     │
│ 变量列表  │   │  │节点│ │节点│  │       │  属性配置      │
│          │   │  └────┘ └────┘  │       │               │
│          │   │    ╲  ╱         │       │               │
│          │   │     ╲╱          │       │               │
│          │   │    ╱╲           │       │               │
│          │   │   ╱  ╲          │       │               │
│          │   │  ┌────┐         │       │               │
│          │   │  │节点│         │       │               │
│          │   │  └────┘         │       │               │
│          │   └──────────────────┘       │               │
│          │     ConsolePanel (RPA)       │               │
├──────────┴──────────────────────────────┴───────────────┤
│                      RunTest 弹窗                        │
└─────────────────────────────────────────────────────────┘
```

---

## 三、组件树与职责

```
Visual.vue (页面入口)
│
├─ Save.vue                    — 保存按钮（Python 代码保存 / 流程保存）
│
├─ Sidebar.vue                 — 左侧边栏（260px，可折叠至 20px）
│   └─ NodeMenu.vue            —   可拖拽的节点模板列表
│   └─ CustomVariable.vue      —   自定义变量管理
│
├─ AppMain.vue                 — 中心内容区编排器
│   │
│   ├─ FlowArea.vue            — 画布容器（20000×20000px 网格）
│   │   ├─ FlowNode.vue ×N     —   流程节点（绝对定位，可拖拽）
│   │   │   ├─ FlowPort.vue    —     左侧端口（输入/流程）
│   │   │   └─ FlowPort.vue    —     右侧端口（输出/流程）
│   │   ├─ RectangleMultiple   —   矩形多选
│   │   └─ ContextMenu.vue     —   右键菜单
│   │
│   └─ ConsolePanel.vue        — 调试控制台（仅 RPA-Mobile 模式）
│
├─ DetailPanel.vue             — 右侧属性面板（320px，可折叠至 20px）
│
└─ RunTest.vue                 — 运行测试弹窗
```

---

## 四、功能模块详解

### 4.1 页面顶部 Header

```
┌──────────────────────────────────────┐
│  未命名流程              [保存] [▶]   │
└──────────────────────────────────────┘
```

| 元素 | 功能 |
|------|------|
| 流程名称 | 显示 `processInfo.name`，未保存时显示"未命名流程" |
| 保存按钮 | 调用 `Save.vue` 组件，Python 模式保存代码，RPA 模式保存流程 JSON |
| 运行按钮 | 触发 `running()` → 打开 `RunTest` 弹窗，设置起止节点后执行流程 |

### 4.2 左侧边栏 Sidebar（260px）

```
┌────────────────────┐
│ 组件 / 变量  [折叠] │
├────────────────────┤
│ ▼ 流程控制          │
│   ┌──────────┐     │
│   │ 开始节点  │ ←拖  │
│   └──────────┘     │
│   ┌──────────┐     │
│   │ 结束节点  │     │
│   └──────────┘     │
│ ▼ 页面操作          │
│   ┌──────────┐     │
│   │ 点击元素  │     │
│   └──────────┘     │
│ ▼ 变量操作          │
│   ...              │
│ ▼ 自定义变量        │
│   变量名: ___       │
│   类型: string     │
└────────────────────┘
```

**交互**：

- **拖拽添加节点**：从 `NodeMenu` 拖拽节点模板到画布，通过 HTML5 Drag & Drop，传输 JSON 数据
- **拖拽添加变量节点**：从 `CustomVariable` 拖拽变量到画布，自动创建 `variable_set`（set 模式，280px 宽）或 `variable_get`（fetch 模式，150px 宽）节点
- **折叠**：点击折叠按钮，宽度收缩至 20px

### 4.3 中心画布 FlowArea

**画布参数**：

| 属性 | 值 |
|------|-----|
| 画布尺寸 | 20000 × 20000 px |
| 缩放范围 | 60% ~ 200% |
| 背景 | 1rem 网格线（浅灰） |
| 容器 ID | `efContainer` |

**画布交互**：

| 操作 | 触发方式 | 效果 |
|------|---------|------|
| **平移画布** | 鼠标右键拖拽 | 画布跟随移动（限制不超出左上边界） |
| **缩放** | 鼠标滚轮 | 以画布左上角为原点缩放（0.6x ~ 2x） |
| **框选节点** | 鼠标左键在空白区域拖拽 | 绘制蓝色虚线矩形，释放后选中范围内所有节点 |
| **右键-节点菜单** | 右键点击节点 | 弹出操作菜单（删除/复制/剪切/禁用等） |
| **右键-画布菜单** | 右键点击空白区 | 弹出"添加节点"菜单 |
| **拖拽连线** | 从端口（三角/圆点）拖拽到另一端口 | 创建连接线 |
| **键盘快捷键** | Ctrl+C/V/X/Z/Y / Delete | 复制/粘贴/剪切/撤销/重做/删除 |

**缩放工具栏**（画布右下角）：

```
[+] [−] [100%]    缩放: 85%
```

### 4.4 流程节点 FlowNode

**节点结构**：

```
┌──────────────────────┐
│ 🔷 节点名称           │ ← 标题栏 (40px)，含颜色图标
├──────────────────────┤
│ ◀ 端口1   端口A ▶    │ ← 左列端口 (50%) | 右列端口 (50%)
│ ◀ 端口2   端口B ▶    │
└──────────────────────┘
```

**节点属性**：

| 属性 | 说明 |
|------|------|
| `id` | 唯一标识，格式 `node-{timestamp}{random}` |
| `title / name` | 节点显示名称 |
| `nodeType` | 节点类别（event / variable_set / variable_get 等） |
| `x, y` | 画布绝对坐标 |
| `width` | 宽度（有双向端口 300px，单向 100px） |
| `cls.color` | 标题栏图标背景色 |
| `cls.icon` | 标题栏图标类名 |
| `ports.input[]` | 左侧端口列表 |
| `ports.output[]` | 右侧端口列表 |
| `detailPanel` | 右侧属性面板的配置项定义 |
| `disable` | 是否禁用（灰色遮罩，跳过执行） |

**节点交互**：

- **拖拽移动**：按住节点空白区域拖拽（`.flow-node-drag` 元素除外）
- **选中**：点击节点 → 蓝色高亮边框 + 阴影
- **多选**：框选或 Ctrl+点击
- **右键菜单**：复制、删除、剪切、原地复制粘贴、断开所有连线、禁用/取消禁用、单点执行、从当前执行

### 4.5 连接端口 FlowPort

**三种端口类型**：

| 端口类型 | 触发条件 | 视觉效果 | 连接规则 |
|----------|---------|---------|----------|
| 🔺 **三角** | `portType='flow'` | CSS border 三角，灰色 `#959CB6`，连接后实心 | 仅能连接另一三角端口（开始↔结束） |
| 🔴 **红色空心圆** | `portType='input'` | 10px 圆，红色边框 `#f23433`，白底，连接后填充红色 | 仅能连接空心圆端口 |
| ⭕ **空心圆** | `portType='output'` 或其它 | 10px 圆，颜色由 `portColor` 决定，白底，连接后填充 | 仅能连接红色空心圆端口 |

**端口数据结构**：

```typescript
{
  id: string;           // 唯一 ID
  name: string;         // 端口名
  portType: string;     // 'flow' | 'input' | 'output'
  title: string;        // 显示标题
  dataType: string;     // 数据类型（string/number/bool/array/password/date/object）
  value: any;           // 端口值
  elementType: string;  // 表单元素类型（textarea/select/checkbox/image/inspect 等）
  visible: string;      // 'yes'/'no'
  cls: { color: string }; // 端口颜色
}
```

**端口交互**：

- **拖拽连线**：从端口圆点/三角（`.flow-node-drag`）拖拽至另一端口
- **悬停高亮**：鼠标悬停时端口放大（`:hover { transform: scale(1.2) }`）
- **表单输入**（仅左侧数据端口）：根据 `elementType` 和 `dataType` 渲染不同表单控件：
  - `textarea` / `pythonEditor` / `jsEditor` → `<el-input type="textarea">`
  - `number` / `float` → `<el-input-number>`
  - `password` → `<el-input type="password" show-password>`
  - `date` → `<el-date-picker>`
  - `select` / `searchSelect` → `<el-select>`（支持远程搜索）
  - `bool` → `<el-checkbox>`
  - `inspect` → `<el-button>捕获元素</el-button>`
  - `image` → 图片预览链接
  - `subprocess` → `<el-button>子流程</el-button>`
  - `array` → 动态添加/删除输入项

### 4.6 连接线系统

**技术实现**：jsPlumb 2.x，SVG 渲染，贝塞尔曲线

**连接线样式**：

| 状态 | 颜色 | 线宽 |
|------|------|------|
| 默认 | `#959CB6`（灰色） | 2px |
| 悬停 | `#176ac5`（蓝色） | 3px |
| 连线末端 | 三角箭头 | 10×10px |

**连接校验流程**（`checkConnectingPorts()`）：

```
拖拽端口A → 释放到端口B
         │
    ┌────▼────┐
    │ 校验 1   │ 同一节点？ → 拒绝 "不能同节点连接"
    ├─────────┤
    │ 校验 2   │ 同侧端口？（已注释）
    ├─────────┤
    │ 校验 3   │ 重复连接？ → 拒绝 "该连线已存在"
    ├─────────┤
    │ 校验 4   │ 类型匹配？
    │          │ flow↔flow ✓  input↔output ✓  output↔input ✓
    │          │ 其他组合 → 拒绝 "端口类型不匹配：X 不能连接到 Y"
    ├─────────┤
    │ 校验 5   │ flow 源端口唯一出线 → 删除旧连线
    ├─────────┤
    │ 校验 6   │ 非 flow 目标端口唯一入线 → 删除旧连线
    └────┬────┘
         │ 全部通过
    ┌────▼────┐
    │ addLink │ → jsPlumb.connect() + store.setLinkList()
    └─────────┘
```

**连线锚点定位**（`addAP()`）：

```
锚点 Y = (titleBottom + ya + myHeight/2) / H

其中：
  titleBottom = 动态实测标题栏底部位置（替代硬编码1.5*TH）
  ya         = 当前端口之前的端口累计高度
  myHeight   = 当前端口元素的 offsetHeight
  H          = 节点总高度
```

### 4.7 右侧属性面板 DetailPanel（320px）

```
┌──────────────────────┐
│ 属性配置      [折叠]  │
├──────────────────────┤
│ 通用配置              │
│  名称: [__________]   │
│  描述: [__________]   │
│  ...                 │
├──────────────────────┤
│ 选项配置              │
│  超时: [____] 秒      │
│  重试: [____] 次      │
│  ...                 │
└──────────────────────┘
```

**功能**：选中节点后显示该节点的 `detailPanel` 配置表单，可修改节点属性。配置变更通过 `changeNodeId` 事件通知画布刷新。

---

## 五、数据流架构

```
Pinia Store (processVisual)
│
├─ nodeList[]         ← 所有节点数据
├─ linkList[]         ← 所有连线数据
├─ variables[]        ← 流程变量
├─ plumb              ← jsPlumb 实例引用
├─ activeNodes[]      ← 当前选中的节点 ID 列表
├─ currentCoverPort   ← 当前悬停的端口
├─ connectDragging    ← 拖拽连线状态
├─ flowStack[]        ← 撤销栈
├─ backFlowStack[]    ← 重做栈
└─ copiedNodes[]      ← 剪切板
```

**数据流方向**：

```
User Drag Drop → FlowArea.createNodeWithPos() → store.setNodeList()
User Drag Port → FlowPort.checkConnectingPorts() → FlowPort.addLink() → store.setLinkList()
User Edit Form → FlowPort.onFormChange() → store.setNodeList() → store.setNodeOperation()
User Delete Node → FlowArea.deleteNode() → jsPlumb.remove() → store.setNodeList()
User Undo/Redo → FlowArea.onBackStack/onFrontStack() → 恢复历史 nodeList + linkList
```

---

## 六、状态管理（Pinia Store 关键字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| `loading` | `boolean` | 页面加载状态 |
| `processType` | `string` | 流程类型（`'RPA-Mobile'` / `'PYTHON'`） |
| `processInfo` | `ProcessInfo` | 流程元信息（id, name, code, type） |
| `nodeList` | `NodeData[]` | 画布上所有节点 |
| `linkList` | `LinkData[]` | 所有连接关系 |
| `plumb` | `any` | jsPlumb 实例 |
| `activeNodes` | `string[]` | 当前选中节点 ID |
| `connectDragging` | `CurrentCoverPort` | 拖拽连线中的端口信息 |
| `currentCoverPort` | `CurrentCoverPort` | 鼠标悬停的端口信息 |
| `flowStack` | `any[]` | 撤销栈（Ctrl+Z） |
| `backFlowStack` | `any[]` | 重做栈（Ctrl+Y） |
| `copiedNodes` | `any[]` | 复制/剪切节点缓存 |

---

## 七、运行测试流程

```
1. 点击 Header [▶ 运行] 按钮
         │
2. 打开 RunTest 弹窗
   ┌─────────────────────────┐
   │ 运行测试                  │
   │ 起始节点: [下拉选择]      │
   │ 结束节点: [下拉选择]      │
   │ 流程 ID: 自动填充         │
   │           [取消] [运行]   │
   └─────────────────────────┘
         │
3. 选择起止节点 → 点击运行
         │
4. store.setRunTestNode({ startNode, endNode })
         │
5. 调用后端 API 执行流程
```

---

## 八、连接点修复记录

本文会话对画布连接系统做了以下修复与优化：

| # | 文件 | 修改内容 | 行数 |
|---|------|---------|------|
| 1 | `FlowPort.vue` | 新增 `portVisualType` 计算属性 + `isInput`，模板两处分支出用 `.rp` / `.sp` 条件化 class，新增 `.rp` / `.rp-connected` CSS 类 | +43/-19 |
| 2 | `FlowArea.vue` | 新增 `colorByPortType` 映射，`createNodeWithPos()` 中端口颜色优先按 `portType` 分配（flow→#959CB6, input→#f23433），dataType 作为回退 | +5/-1 |
| 3 | `FlowNode.vue` | `addAP()` 两级锚点修复：① `titleBottom` 通过 `getComputedStyle` + `offsetTop/offsetHeight` 动态实测标题栏底部（替代硬编码 `1.5*TH=60`，消除 17px 基准偏差）；② `myHeight/2` 将锚点从端口顶部移至垂直中心 | +11/-1 |
| 4 | `FlowPort.vue` | 重写 `checkConnectingPorts()` 校验逻辑：`allowedPairs` Map 严格定义 `flow→flow` / `input→output` / `output→input` 匹配规则，Check 5/6 从 `if-else` 改为独立 `if` 块，错误提示精确到具体类型名 | +18/-12 |

**修复效果**：

| 修复项 | 修复前 | 修复后 |
|--------|--------|--------|
| 端口视觉 | flow=三角，其他=统一样式圆 | flow=三角，input=红色空心圆，output=空心圆 |
| 连接规则 | 仅限制 flow 与非 flow 混连 | 严格三类型匹配：flow↔flow, input↔output, output↔input |
| 锚点 Y 轴 | `(60 + ya) / H`，偏下 17px + 顶部对齐 | `(实测titleBottom + ya + myHeight/2) / H`，精确垂直居中 |
| 颜色分配 | dataType 单一映射 | portType 优先 → dataType 回退 |
