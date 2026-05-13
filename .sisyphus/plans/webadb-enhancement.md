# WebAdb 1.0 Enhancement Plan

## TL;DR

> **Quick Summary**: Port audio streaming, device occupancy handling, and code quality improvements from the 2.0 WebAdb component into the 1.0 version — while preserving the existing `useWebAdbScrcpy.js` composable separation pattern. Convert JavaScript composables to TypeScript, add JSDoc/types, and modernize component patterns.
>
> **Deliverables**:
> - Audio streaming support (AAC/Opus/Raw via WebCodecs AudioDecoder)
> - Device occupancy detection + force-occupy UI
> - TypeScript composables (useWebAdbScrcpy.ts, useScrcpyDevice.ts)
> - Updated DeviceOperateButton with Element Plus icons + reconnect
> - Updated RenderContainer with inline emits + ref expose
> - Updated utils.js wsScreenshot with opts parameter
> - Updated index.vue with connection-state emit + new exposes
> - New `src/utils/scrcpy/audio-decode-stream.js` utility
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Dep install → useWebAdbScrcpy.ts → index.vue

---

## Context

### Original Request
Analyze and compare the 1.0 and 2.0 WebAdb components, then update the 1.0 version with 2.0 enhancements while preserving the `useWebAdbScrcpy.js` composable architecture.

### Interview Summary
**Key Discussions**:
- Audio streaming: **YES** — add AAC/Opus/Raw support with `@yume-chan/pcm-player`
- Device occupancy: **YES** — add `getDevicesStatus()`, `dblclick()` force occupy, `occupyInfo` state
- TypeScript conversion: **YES** — convert composables to `.ts` (project has `tsconfig.json` configured)
- Test strategy: **NO tests** — agent-executed QA Scenarios only
- LargeScreen.vue, fileManage/ — **out of scope**, keep unchanged

**Research Findings**:
- `trailingThrottle` and `clamp` already in `src/utils/webadb.ts` ✅ — no import changes needed
- `@yume-chan/stream-extra` already installed ✅
- `@yume-chan/pcm-player` **NOT installed** — must add
- Audio-decode-stream.js does NOT exist in 1.0 — must port from 2.0
- `tsconfig.json` already includes `src/**/*.ts` ✅ — TS conversion will work

---

## Work Objectives

### Core Objective
Enhance the 1.0 WebAdb component by porting audio, occupancy, and code quality improvements from 2.0, while maintaining the clean composable architecture.

### Concrete Deliverables
- `src/components/WebAdb/useScrcpyDevice.ts` — converted to TS with improvements
- `src/components/WebAdb/useWebAdbScrcpy.ts` — converted to TS with audio + occupancy
- `src/utils/scrcpy/audio-decode-stream.js` — new utility (AacDecodeStream, OpusDecodeStream)
- `src/components/WebAdb/utils.js` — wsScreenshot opts parameter
- `src/components/WebAdb/index.vue` — connection-state emit, updated expose
- `src/components/WebAdb/DeviceOperateButton/index.vue` — EL icons + reconnect
- `src/components/WebAdb/RenderContainer/index.vue` — inline emits + expose

### Must Have
- All existing `index.vue` prop/emit/expose API preserved (backward compatible)
- `useWebAdbScrcpy` composable pattern preserved (not inlined into index.vue)
- Audio streaming decodes and plays through browser's WebCodecs AudioDecoder
- Device occupancy shows "被占用" state with double-click force occupy
- All original touch/keyboard/wheel ADB injection functions work after TS conversion

### Must NOT Have (Guardrails)
- Do NOT inline useWebAdbScrcpy logic into index.vue (keep the composable)
- Do NOT modify `LargeScreen.vue` — out of scope
- Do NOT add `LiveManage.vue` — separate feature
- Do NOT add full file manager — separate feature
- Do NOT break existing `defineExpose` API surface
- Do NOT add console.log in production paths (use warnings only for edge cases)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (TypeScript via tsconfig.json)
- **Automated tests**: None
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
- **TypeScript compilation**: `npx vue-tsc --noEmit` — no type errors
- **Library/module**: Bash (node REPL) — import and verify exports
- **Build verification**: `npm run build` (or equivalent) — no build errors
- **Evidence**: Screenshots/screenshots/logs saved to `.sisyphus/evidence/`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — 6 parallel tasks):
├── Task 1: Install @yume-chan/pcm-player dependency
├── Task 2: Create audio-decode-stream.js (port from 2.0)
├── Task 3: Convert useScrcpyDevice.js → useScrcpyDevice.ts
├── Task 4: Update utils.js with opts parameter for wsScreenshot
├── Task 5: Update DeviceOperateButton/index.vue (icons + reconnect)
└── Task 6: Update RenderContainer/index.vue (inline emits + expose)

Wave 2 (Core — depends on Wave 1 tasks 1-3):
├── Task 7: Convert useWebAdbScrcpy.js → useWebAdbScrcpy.ts (audio + occupancy + TS)

Wave 3 (Integration — depends on Task 7):
├── Task 8: Update index.vue (connection-state emit, new exposes, TypeScript imports)

Wave FINAL (All complete — 4 parallel reviews):
├── Task F1: Plan Compliance Audit (oracle)
├── Task F2: Build + TypeCheck Verification
├── Task F3: Real Manual QA (executor)
└── Task F4: Scope Fidelity Check
→ Present results → Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 7 → Task 8 → F1-F4
Parallel Speedup: ~60% faster than sequential
```

---

## TODOs

- [ ] 1. Install `@yume-chan/pcm-player` dependency

  **What to do**:
  - Run `npm install @yume-chan/pcm-player@^1.0.0` in `apps/web-ele/`
  - Verify the package appears in `package.json` dependencies
  - Confirm the module can be imported without errors

  **Must NOT do**:
  - Do NOT install other unrelated packages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution, trivial verification
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: Task 7 (useWebAdbScrcpy.ts needs this for audio imports)
  - **Blocked By**: None

  **References**:
  - `apps/web-ele/package.json` — current dependencies (to add pcm-player)
  - `apps/web-ele/node_modules/@yume-chan/pcm-player/` — verify existence after install

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Verify dependency installed
    Tool: Bash
    Preconditions: Working directory = apps/web-ele
    Steps:
      1. Run `npm ls @yume-chan/pcm-player` to verify installation
    Expected Result: Package is listed with version ^1.0.0
    Evidence: .sisyphus/evidence/task-01-dependency-installed.txt
  ```

  **Commit**: YES
  - Message: `chore(deps): add @yume-chan/pcm-player for audio streaming`
  - Files: `apps/web-ele/package.json`, `apps/web-ele/pnpm-lock.yaml` (or equivalent)

---

- [ ] 2. Create `src/utils/scrcpy/audio-decode-stream.js` (port from 2.0)

  **What to do**:
  - Create the directory `src/utils/scrcpy/` if it doesn't exist
  - Port the `AacDecodeStream` and `OpusDecodeStream` classes from the 2.0 version
  - Both classes extend `TransformStream` from `@yume-chan/stream-extra`
  - `AacDecodeStream`: config takes `{ codec, numberOfChannels, sampleRate, description? }`, decodes AAC to f32-planar via WebCodecs `AudioDecoder`
  - `OpusDecodeStream`: config takes `{ codec, numberOfChannels, sampleRate }`, decodes Opus to f32
  - Export both classes as named exports
  - Add JSDoc comments explaining each class and its parameters

  **Source file**: `D:\project\social-media-web-vue3\apps\web-ele\src\utils\scrcpy\audio-decode-stream.js`

  **Must NOT do**:
  - Do NOT convert this file to TypeScript (keep as .js, the 2.0 source is .js)
  - Do NOT modify the transform logic — port as-is

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward file port with clear source
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-6)
  - **Blocks**: Task 7 (useWebAdbScrcpy.ts imports these classes)
  - **Blocked By**: None

  **References**:
  - `D:\project\social-media-web-vue3\apps\web-ele\src\utils\scrcpy\audio-decode-stream.js` — SOURCE FILE to port (full content available in analysis)
  - `apps/web-ele/src/utils/` — target directory

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: File created and exports verified
    Tool: Bash
    Preconditions: Target directory exists
    Steps:
      1. Verify file exists at apps/web-ele/src/utils/scrcpy/audio-decode-stream.js
      2. Run node REPL: `const m = require('./apps/web-ele/src/utils/scrcpy/audio-decode-stream.js')` or use `import()` syntax
      3. Check that `AacDecodeStream` and `OpusDecodeStream` are exported classes
    Expected Result: Both classes are exported and extend TransformStream
    Evidence: .sisyphus/evidence/task-02-exports-verified.txt
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `refactor(webadb): port audio-decode-stream and convert useScrcpyDevice to TS`
  - Files: `apps/web-ele/src/utils/scrcpy/audio-decode-stream.js`

---

- [ ] 3. Convert `useScrcpyDevice.js` → `useScrcpyDevice.ts` with TypeScript

  **What to do**:
  - Rename `useScrcpyDevice.js` to `useScrcpyDevice.ts`
  - Add TypeScript type annotations following the 2.0 version's patterns:
    - `DeviceLike` type: `{ serial?: string; deviceIp?: string }`
    - `ScrcpyEmitFn` type: `(event: string, ...args: unknown[]) => void`
    - Parameter types for all functions
    - Return types for all functions
  - Improve the `deviceInfo` and `deviceSocket` computed properties to be cleaner (reference 2.0's pattern with separate `deviceSerial` computed)
  - Add the `MOUSE_EVENT_BUTTON_TO_ANDROID_BUTTON` as an exported constant (matching 2.0 pattern) rather than returning from the composable
  - Add JSDoc comments for all public functions
  - Ensure all imports resolve correctly (the `.js` extension in current imports will need updating)
  - Keep the `deviceClient = ref(null)` with comment about WebSocket direct mode

  **Source file** (for typing reference): `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\useScrcpyDevice.ts`

  **Must NOT do**:
  - Do NOT change the `useScrcpyDevice` function signature (must remain callable as `useScrcpyDevice(deviceRef, emit)`)
  - Do NOT remove existing exported functions
  - Do NOT break the `deviceInfo` computed setter behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file conversion with clear source reference
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4-6)
  - **Blocks**: Task 7 (useWebAdbScrcpy.ts imports from useScrcpyDevice.ts)
  - **Blocked By**: None

  **References**:
  - `apps/web-ele/src/components/WebAdb/useScrcpyDevice.js` — CURRENT file to convert
  - `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\useScrcpyDevice.ts` — 2.0 TypeScript reference
  - `apps/web-ele/tsconfig.json` — confirms TS is configured

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: TypeScript compilation succeeds
    Tool: Bash
    Preconditions: Working directory = apps/web-ele
    Steps:
      1. Run `npx vue-tsc --noEmit` to type-check
    Expected Result: No type errors in useScrcpyDevice.ts
    Evidence: .sisyphus/evidence/task-03-ts-compile.txt

  Scenario: All exports preserved
    Tool: Bash
    Preconditions: TS file exists
    Steps:
      1. Grep the .ts file for "return {" to verify all exports are present
    Expected Result: All original exports (serialKey, getDeviceStore, setDeviceSocket, writeUInt32BE, spawnWaitText, screenshot, screenshotToAlbum, volumeFn, rotateFn, setSizeFn, restoreResolution, clearTasks, openSetting, openApp, goUrl) are present
    Evidence: .sisyphus/evidence/task-03-exports.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `refactor(webadb): port audio-decode-stream and convert useScrcpyDevice to TS`
  - Files: `apps/web-ele/src/components/WebAdb/useScrcpyDevice.ts`, `apps/web-ele/src/components/WebAdb/useScrcpyDevice.js` (deleted)

---

- [ ] 4. Update `utils.js` — add `opts` parameter to `wsScreenshot`

  **What to do**:
  - Modify `wsScreenshot(buffer, socket)` → `wsScreenshot(buffer, socket, opts = {})`
  - Replace all `this.deviceInfo`, `this.width`, `this.height`, `this.deviceRealWidth`, `this.deviceRealHeight` references with `opts.deviceInfo`, `opts.width`, etc.
  - This is a pattern improvement: the 2.0 version passes opts as a parameter instead of relying on `this` context, which is fragile
  - Keep all other functions (`wsHeartbeat`, `wsSetClipboard`, `setClipboardFallback`) unchanged
  - Add JSDoc comments for all exported functions

  **Source reference**: `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\utils.js` line 18

  **Must NOT do**:
  - Do NOT change the behavior or logic of the screenshot processing
  - Do NOT modify `wsHeartbeat`, `wsSetClipboard`, or `setClipboardFallback`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single function signature change with clear reference
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5-6)
  - **Blocks**: Task 7 (useWebAdbScrcpy.ts will need to pass opts)
  - **Blocked By**: None

  **References**:
  - `apps/web-ele/src/components/WebAdb/utils.js` — CURRENT file
  - `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\utils.js` — 2.0 reference showing opts parameter

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: wsScreenshot signature updated
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run: grep "export const wsScreenshot = function" apps/web-ele/src/components/WebAdb/utils.js
    Expected Result: Line reads 'export const wsScreenshot = function (buffer, socket, opts = {})'
    Evidence: .sisyphus/evidence/task-04-signature.txt

  Scenario: No remaining "this." references in wsScreenshot
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run: grep -n "this\." apps/web-ele/src/components/WebAdb/utils.js | grep -v "setClipboardFallback"
    Expected Result: No "this." references outside setClipboardFallback
    Evidence: .sisyphus/evidence/task-04-no-this-refs.txt
  ```

  **Commit**: YES (groups with Tasks 5-6)
  - Message: `refactor(webadb): update utils, DeviceOperateButton, RenderContainer patterns`
  - Files: `apps/web-ele/src/components/WebAdb/utils.js`

---

- [ ] 5. Update `DeviceOperateButton/index.vue` — Element Plus icons + reconnect button

  **What to do**:
  - Replace the `iconfont` CSS class icons with Element Plus SVG icon components
  - Add import: `import { ArrowLeft, Grid, Menu, RefreshRight, House } from '@element-plus/icons-vue'`
  - Update button definitions: `icon-back` → `ArrowLeft`, `icon-home` → `House`, `icon-multitask` → `Grid`, `icon-clear-speed` → `Menu`, `icon-shezhi` → `RefreshRight`
  - Replace "openSetting" button with "reconnect" button emitting `'reconnect'`
  - Update emit declaration: `const emit = defineEmits(['reconnect', 'pressKey'])`
  - Replace template `<i :class="icon iconfont ${btn.icon}">` with `<el-icon :size="18"><component :is="btn.icon" /></el-icon>`
  - Change button data from `computed(() => [...])` to static `const buttons = [...]`
  - Remove the `$t` import and computed (2.0 uses static strings)

  **Source reference**: `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\DeviceOperateButton\index.vue`

  **Must NOT do**:
  - Do NOT change the visual styling (keep same LESS/CSS classes)
  - Do NOT remove the `el-tooltip` wrapping

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with icon replacements
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/web-ele/src/components/WebAdb/DeviceOperateButton/index.vue` — CURRENT file
  - `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\DeviceOperateButton\index.vue` — 2.0 reference

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Component imports and structure
    Tool: Bash (grep)
    Preconditions: File updated
    Steps:
      1. Run: grep "@element-plus/icons-vue" apps/web-ele/src/components/WebAdb/DeviceOperateButton/index.vue
      2. Run: grep "defineEmits" apps/web-ele/src/components/WebAdb/DeviceOperateButton/index.vue
      3. Run: grep "reconnect" apps/web-ele/src/components/WebAdb/DeviceOperateButton/index.vue
    Expected Result: Imports ArrowLeft/Grid/Menu/RefreshRight/House, emits 'reconnect' and 'pressKey', has reconnect button
    Evidence: .sisyphus/evidence/task-05-icons-and-emits.txt
  ```

  **Commit**: YES (groups with Tasks 4, 6)
  - Message: `refactor(webadb): update utils, DeviceOperateButton, RenderContainer patterns`
  - Files: `apps/web-ele/src/components/WebAdb/DeviceOperateButton/index.vue`

---

- [ ] 6. Update `RenderContainer/index.vue` — inline emits + expose renderContainer

  **What to do**:
  - Replace separate handler functions with inline emit calls in the template
  - Change from: `@pointerdown="onPointerDown"` with `function onPointerDown(e) { emit('pointerdown', e) }`
  - Change to: `@pointerdown="emit('pointerdown', $event)"` directly in template
  - Simplify all handlers the same way: pointerdown, pointermove, pointerup, pointercancel, contextmenu, wheel, pointerenter, pointerleave
  - Add `import { ref } from 'vue'` and `const renderContainer = ref(null)`
  - Add `defineExpose({ renderContainer })`
  - Remove the now-unnecessary individual handler functions
  - Keep the `<style>` block and `<template>` structure unchanged

  **Source reference**: `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\RenderContainer\index.vue`

  **Must NOT do**:
  - Do NOT change CSS or template structure
  - Do NOT remove any emits from the emits array
  - Do NOT change props definition

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple template simplification with clear reference
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/web-ele/src/components/WebAdb/RenderContainer/index.vue` — CURRENT file
  - `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\RenderContainer\index.vue` — 2.0 reference

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Template uses inline emits
    Tool: Bash (grep)
    Preconditions: File updated
    Steps:
      1. Run: grep -c "emit('" apps/web-ele/src/components/WebAdb/RenderContainer/index.vue
    Expected Result: Template uses inline "emit('event', $event)" pattern (7+ matches for all events)
    Evidence: .sisyphus/evidence/task-06-inline-emits.txt

  Scenario: renderContainer exposed and no handler functions
    Tool: Bash (grep)
    Preconditions: File updated
    Steps:
      1. Run: grep "defineExpose" apps/web-ele/src/components/WebAdb/RenderContainer/index.vue
      2. Run: grep "function onPointer" apps/web-ele/src/components/WebAdb/RenderContainer/index.vue || echo "None found"
    Expected Result: defineExpose({ renderContainer }) exists, no onPointer* handler functions
    Evidence: .sisyphus/evidence/task-06-expose.txt
  ```

  **Commit**: YES (groups with Tasks 4-5)
  - Message: `refactor(webadb): update utils, DeviceOperateButton, RenderContainer patterns`
  - Files: `apps/web-ele/src/components/WebAdb/RenderContainer/index.vue`

---

- [ ] 7. Convert `useWebAdbScrcpy.js` → `useWebAdbScrcpy.ts` with audio + occupancy + TypeScript

  **What to do**:
  This is the LARGEST task. Convert the 1176-line composable from JS to TS while adding:

  **A. TypeScript Conversion**:
  - Rename `useWebAdbScrcpy.js` → `useWebAdbScrcpy.ts`
  - Add TypeScript types for all refs, functions, and return values
  - Define interfaces/types at the top of file:
    - `MediaPacket` interface: `{ type: 'configuration' | 'frame'; keyframe: boolean; pts?: bigint; data: Uint8Array }`
    - `ConnectionState` type: `'disconnected' | 'connected' | 'connectedTrue' | 'error' | 'loading'`
    - `KeyParams` interface for `executeKeyAction`
    - `TouchParams` interface for `executeTouchAction`
  - Add return type annotation to `useWebAdbScrcpy()` function
  - Use `import type` where appropriate
  - Change `let hasInitializedDecoder = false` and similar module-level booleans to use `let` with correct types

  **B. Audio Streaming (port from 2.0)**:
  - Add refs: `audioPlayer`, `audioCodec`, `audioStream`, `audioStreamController`, `audioStreamClosed`, `audioQueue`
  - Add imports:
    - `Float32PcmPlayer, Float32PlanerPcmPlayer, Int16PcmPlayer` from `@yume-chan/pcm-player`
    - `AacDecodeStream, OpusDecodeStream` from `#/utils/scrcpy/audio-decode-stream.js`
    - `WritableStream` from `@yume-chan/stream-extra`
    - `ScrcpyAudioCodec` from `@yume-chan/scrcpy`
  - Add `createAudioStream()` function (parallel to `createVideoStream()`)
  - Add `initializeAudio({ audioStream })` function — handles AAC/Opus/Raw codec paths
  - Add `wsAudioStream(buffer)` function — parses message type 0x04, handles audio packets
  - In `wsDeviceInfo()`: after setting `deviceInfo`, check for `data.audioCodec` and call `initializeAudio`
  - In `initWs()`: call `createAudioStream()` alongside `createVideoStream()`
  - In WebSocket `onmessage` handler: add `case 0x04: wsAudioStream(buffer, socket); break;`
  - In `onBeforeUnmount`: add cleanup for audio stream + player
  - Update `destroyClient` to clean up audio resources

  **C. Device Occupancy (port from 2.0)**:
  - Add refs: `occupyInfo` (ref of object)
  - Add import: `axios` from `axios`, `ElMessage` from `element-plus`
  - Add `connection-state` emit to the `emit` parameter (currently just `'messageSent'`)
  - Add `getDevicesStatus()` — POST to `/adb/device/status`, check `connected` field
  - Add `dblclick()` — POST to `/adb/device/disconnect`, then re-init
  - Add handling for close codes `4000`, `4001` in `handleSocketClose` — parse JSON reason, set `occupyInfo`, set `connectionState` to `'connectedTrue'`
  - Add `case 0x07: wsErrorLog(buffer, socket); break;` in onmessage handler
  - In `initializeDecoder`: after receiving keyframe, set `connectionState.value = 'connected'` (matching 2.0 pattern)
  - In `onMounted`: call `getDevicesStatus()` instead of directly calling `initWs()`

  **D. Quality Improvements**:
  - Add `safeDisposeDecoderInstance(decoder)` helper function
  - Use `markRaw()` for decoder and renderer instances to prevent Vue reactivity proxy issues
  - Use `buffer.set(bytes, 5)` instead of manual loop in `sendBinaryMessage`
  - Use `socket.addEventListener('open', handler)` instead of `socket.onopen = handler` (event listener pattern)
  - Update `lastClipboardContent` to store plain string (not `JSON.parse(JSON.stringify(...))`)
  - Add clarity parameter to `initWs(clarity)` and `reconnect(clarity)`
  - Move `connectionState.value = 'connected'` logic from `wsDeviceInfo` to `initializeDecoder` (matching 2.0: connection is confirmed when keyframe is received)
  - Only emit `'messageSent'` in `sendBinaryMessage` (not `spawnWaitText` — that's for internal use)

  **Must NOT do**:
  - Do NOT change the function signature of `useWebAdbScrcpy(props, emit, renderRef)` 
  - Do NOT remove any existing return values from the composable
  - Do NOT inline any logic into `index.vue`
  - Do NOT change any existing function name or behavior
  - Do NOT add the full `LiveManage.vue` or file manager features here
  - Do NOT modify the `changeStyle`, `swapWidthHeight`, `calculateWidth`, `setRendererStyle`, `updateContainerStyle` functions unless adding types

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex composable conversion with multiple feature additions, must preserve all existing behavior
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential — this is the critical path)
  - **Blocks**: Task 8 (index.vue depends on updated composable interface)
  - **Blocked By**: Tasks 1, 2, 3 (deps + audio-decode-stream + useScrcpyDevice.ts)

  **References**:
  - `apps/web-ele/src/components/WebAdb/useWebAdbScrcpy.js` — CURRENT 1176-line file to convert
  - `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\index.vue` — 2.0 monolithic reference for audio + occupancy patterns
  - `apps/web-ele/src/utils/scrcpy/audio-decode-stream.js` — NEW file (created by Task 2)
  - `apps/web-ele/src/components/WebAdb/useScrcpyDevice.ts` — UPDATED file (created by Task 3)

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: TypeScript compilation passes
    Tool: Bash
    Preconditions: All deps installed, all other TS files exist
    Steps:
      1. Run: npx vue-tsc --noEmit
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-07-ts-compile.txt

  Scenario: All original exports preserved
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run: grep "return {" apps/web-ele/src/components/WebAdb/useWebAdbScrcpy.ts
    Expected Result: All original exports present (classes, connectionState, containerStyle, handlePointer*, reconnect, handlePressKey, executeShellCommand, screenshot, screenshotToAlbum, volumeFn, rotateFn, setSizeFn, restoreResolution, clearTasks, openSetting, openApp, goUrl, calculateSyncPosition, handleWebSocketVideoPacket, handleWebSocketBinaryPacket, handlePacket, clientPositionToDevicePosition)
    Evidence: .sisyphus/evidence/task-07-exports.txt

  Scenario: Audio streaming functions present
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run: grep -c "createAudioStream\|initializeAudio\|wsAudioStream\|audioPlayer\|audioCodec" apps/web-ele/src/components/WebAdb/useWebAdbScrcpy.ts
    Expected Result: At least 5 matches indicating audio support was added
    Evidence: .sisyphus/evidence/task-07-audio.txt

  Scenario: Occupancy handling present
    Tool: Bash (grep)
    Preconditions: File exists
    Steps:
      1. Run: grep -c "occupyInfo\|getDevicesStatus\|dblclick\|connectedTrue\|4000" apps/web-ele/src/components/WebAdb/useWebAdbScrcpy.ts
    Expected Result: At least 5 matches indicating occupancy handling was added
    Evidence: .sisyphus/evidence/task-07-occupancy.txt
  ```

  **Commit**: YES
  - Message: `feat(webadb): convert useWebAdbScrcpy to TS with audio + occupancy support`
  - Files: `apps/web-ele/src/components/WebAdb/useWebAdbScrcpy.ts`, `apps/web-ele/src/components/WebAdb/useWebAdbScrcpy.js` (deleted)

---

- [ ] 8. Update `index.vue` — connection-state emit, new exposes, TypeScript imports

  **What to do**:
  - Update the import from `useWebAdbScrcpy` — it's now `./useWebAdbScrcpy.ts` (or just `./useWebAdbScrcpy` — Vue/Vite resolves .ts automatically)
  - Add new emit: `'connection-state'` alongside existing `'messageSent'`
  - Destructure new values from `useWebAdbScrcpy()`:
    - `executeKeyAction` — expose for parent usage
    - `occupyInfo` — for reactive template updates (if needed in template)
  - Update `defineExpose` to include `executeKeyAction`
  - Add `<FileManagerDrawer>` component in template section (conditionally rendered with `v-if="!embedded"`)
  - Update the loading template to show occupancy info when `connectionState === 'connectedTrue'`:
    ```vue
    <template v-if="connectionState === 'connectedTrue'">
      <span @click.stop="aaa" @dblclick.stop="dblclick">
        <template v-if="occupyInfo.action == 'timeout'">设备超时，<br />双击重连</template>
        <template v-else>{{ occupyInfo.userName }} 正在使用，<br />双击强制占用</template>
      </span>
    </template>
    ```
  - Add `import FileManagerDrawer from '#/components/WebAdb/FileManagerDrawer.vue'` (note: this component is NOT being created yet — see note below)

  **NOTE ON FileManagerDrawer**: Do NOT create FileManagerDrawer.vue in this task. The `v-if="!embedded"` guard means it won't render until the component exists. Either:
  - Option A: Skip adding FileManagerDrawer to the template (recommended — keep it as a future enhancement)
  - Option B: Create a minimal stub FileManagerDrawer.vue later

  **Must NOT do**:
  - Do NOT remove any existing `defineExpose` entries
  - Do NOT change the `<RenderContainer>` component event bindings
  - Do NOT change the `<style>` section
  - Do NOT break backward compatibility with `LargeScreen.vue` or other consumers

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Template changes + component integration
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential — depends on composable)
  - **Blocks**: None
  - **Blocked By**: Task 7 (useWebAdbScrcpy.ts interface must be stable)

  **References**:
  - `apps/web-ele/src/components/WebAdb/index.vue` — CURRENT file to update
  - `D:\project\social-media-web-vue3\apps\web-ele\src\components\WebAdb\index.vue` — 2.0 reference for template changes

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: TypeScript compilation passes
    Tool: Bash
    Preconditions: All files exist
    Steps:
      1. Run: npx vue-tsc --noEmit
    Expected Result: No type errors, index.vue types resolve through useWebAdbScrcpy.ts
    Evidence: .sisyphus/evidence/task-08-ts-compile.txt

  Scenario: All original expose preserved
    Tool: Bash (grep)
    Preconditions: File updated
    Steps:
      1. Run: grep "defineExpose" -A 20 apps/web-ele/src/components/WebAdb/index.vue
    Expected Result: Contains all original exposes (connectionState, reconnect, handlePressKey, screenshot, screenshotToAlbum, volumeFn, rotateFn, setSizeFn, restoreResolution, clearTasks, openSetting, openApp, goUrl)
    Evidence: .sisyphus/evidence/task-08-expose.txt

  Scenario: New connection-state emit declared
    Tool: Bash (grep)
    Preconditions: File updated
    Steps:
      1. Run: grep "defineEmits" apps/web-ele/src/components/WebAdb/index.vue
    Expected Result: Emits includes 'connection-state' along with 'messageSent'
    Evidence: .sisyphus/evidence/task-08-emits.txt
  ```

  **Commit**: YES
  - Message: `feat(webadb): update index.vue with connection-state emit and new exposes`
  - Files: `apps/web-ele/src/components/WebAdb/index.vue`

---

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Build + TypeCheck Verification** — `unspecified-high`
  Run `npx vue-tsc --noEmit` (type check) + project build command. Verify no type errors in new .ts files. Check all imports resolve correctly (useWebAdbScrcpy → useWebAdbScrcpy.ts, useScrcpyDevice → useScrcpyDevice.ts).
  Output: `TypeCheck [PASS/FAIL] | Build [PASS/FAIL] | Imports [ALL RESOLVE / BROKEN]`

- [ ] F3. **Real Manual QA** — executor
  Start from clean state. Verify: (1) index.vue renders without errors, (2) all `defineExpose` methods are callable, (3) TypeScript compilation passes, (4) audio-decode-stream.js exports both classes, (5) no broken imports after renaming .js→.ts. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Checks [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Task 1**: `chore(deps): add @yume-chan/pcm-player for audio streaming`
- **Task 2-3**: `refactor(webadb): port audio-decode-stream and convert useScrcpyDevice to TS`
- **Task 4-6**: `refactor(webadb): update utils, DeviceOperateButton, RenderContainer patterns`
- **Task 7**: `feat(webadb): convert useWebAdbScrcpy to TS with audio + occupancy support`
- **Task 8**: `feat(webadb): update index.vue with connection-state emit and new exposes`

---

## Success Criteria

### Verification Commands
```bash
npx vue-tsc --noEmit                        # Expected: No type errors
# Project build (check package.json for build script):
npm run build                               # Expected: Build succeeds
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] TypeScript compilation passes with zero errors
- [ ] Build succeeds
- [ ] All original `index.vue` exports preserved
- [ ] `useWebAdbScrcpy` composable pattern maintained
