<script setup lang="ts">
import { onUnmounted, provide, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useProcessVisualStore } from '#/store/modules/processVisual';
import type { FormDataItem } from '../types';

// Inline debounce
function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }) as any;
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}

const emit = defineEmits<{
  (e: 'collapse', val: boolean): void;
}>();

const processVisualStore = useProcessVisualStore();
const { activeInfo, nodeList, plumb, linkList } =
  storeToRefs(processVisualStore);

const isCollapse = ref(false);
const showCollapse = ref(false);
const currentNodeId = ref('');
const showNodePanel = ref(false);
const variableId = ref('');

// Variable form
const variableForm = ref<Record<string, any>>({
  name: '',
  dataType: '',
  value: '',
  scope: 'flow',
  visible: 'yes',
});

// Node form
const commonForm = ref<Record<string, any>>({});
const optionsForm = ref<Record<string, any>>({});
const commonRule = ref<FormDataItem[]>([]);
const optionsRule = ref<FormDataItem[]>([]);
const detailPanelTitle = ref({ common: '通用配置', options: '选项配置' });

// Provide context for child components
provide('size', 'small');
provide('variableId', '');
provide('scope', 'flow');

// Watch activeInfo
watch(
  () => activeInfo.value,
  (val) => {
    if (val?.type === 'node' && val?.id) {
      currentNodeId.value = val.id;
      loadNodeDetail(val.id);
      showNodePanel.value = true;
    } else if (val?.type === 'variable' && val?.id && val?.data) {
      loadVariableDetail(val.data);
      showNodePanel.value = false;
    } else {
      showNodePanel.value = false;
      currentNodeId.value = '';
    }
  },
  { deep: true },
);

// Transform raw formDatas through judgeRuleType logic → add _renderType for template
interface RenderFormData extends FormDataItem {
  _renderType: string;
}
function transformFormDatas(datas: FormDataItem[]): RenderFormData[] {
  return datas.map((info) => {
    let _renderType = 'text';
    const et = info.elementType;
    const dt = info.dataType;
    if (et === 'textarea' || et === 'pythonEditor' || et === 'jsEditor')
      _renderType = 'textarea';
    else if (et === 'input') {
      if (dt === 'number' || dt === 'float') _renderType = 'number';
      else if (dt === 'password') _renderType = 'password';
      else if (dt === 'date') _renderType = 'date';
      else _renderType = 'text';
    } else if (et === 'checkbox') {
      if (info.name === 'scope') _renderType = 'scope';
      else if (dt === 'bool') _renderType = 'radio';
      else _renderType = 'checkbox';
    } else if (et === 'select') _renderType = 'select';
    else if (et === 'array') _renderType = 'array';
    else if (et === 'image' || et === 'text') _renderType = 'panel-parameter';
    else if (et === 'multicheckbox') _renderType = 'multicheckbox';
    return { ...info, _renderType };
  });
}

function loadNodeDetail(nodeId: string) {
  const node = nodeList.value.find((n: any) => n.id === nodeId);
  if (!node) return;
  variableId.value = node.variableId || '';
  const dp = node.detailPanel || {
    common: { title: '通用配置', formDatas: [] },
    options: { title: '选项配置', formDatas: [] },
  };
  detailPanelTitle.value = {
    common: dp.common?.title || '通用配置',
    options: dp.options?.title || '选项配置',
  };
  commonRule.value = transformFormDatas(dp.common?.formDatas || []) as any;
  optionsRule.value = transformFormDatas(dp.options?.formDatas || []) as any;
  const cf: Record<string, any> = {};
  commonRule.value.forEach((f: any) => {
    const raw = f.value;
    // 对于 number 类型的字段，空值应转换为 null，避免 ElInputNumber 类型检查警告
    if (
      f._renderType === 'number' &&
      (raw === '' || raw === undefined || raw === null)
    ) {
      cf[f.name] = null;
    } else {
      cf[f.name] = raw;
    }
  });
  commonForm.value = cf;
  const of: Record<string, any> = {};
  optionsRule.value.forEach((f: any) => {
    const raw = f.value;
    if (
      f._renderType === 'number' &&
      (raw === '' || raw === undefined || raw === null)
    ) {
      of[f.name] = null;
    } else {
      of[f.name] = raw;
    }
  });
  optionsForm.value = of;
}

function loadVariableDetail(variable: any) {
  variableForm.value = {
    name: variable.name || '',
    dataType: variable.dataType || '',
    value: variable.value ?? '',
    scope: variable.scope || 'flow',
    visible: variable.visible || 'yes',
  };
}

function onCollapse(val: boolean) {
  emit('collapse', val);
  isCollapse.value = val;
}

// Form change with debounce per source project pattern
const debouncedUpdate = debounce(
  (field: string, value: any, panelType: 'common' | 'options') => {
    const nodes = [...nodeList.value];
    const idx = nodes.findIndex((n: any) => n.id === currentNodeId.value);
    if (idx === -1 || !nodes[idx].detailPanel?.[panelType]) return;

    const fdIdx = nodes[idx].detailPanel[panelType].formDatas.findIndex(
      (f: any) => f.name === field,
    );
    if (fdIdx === -1) return;
    const dataType =
      nodes[idx].detailPanel[panelType].formDatas[fdIdx].dataType;

    switch (dataType) {
      case 'array':
        nodes[idx].detailPanel[panelType].formDatas[fdIdx].value = value;
        processVisualStore.setNodeList(nodes);
        processVisualStore.setNodeOperation('uploadArray');
        break;
      case 'bool':
        nodes[idx].detailPanel[panelType].formDatas[fdIdx].value =
          Array.isArray(value) ? value.length > 0 : !!value;
        processVisualStore.setNodeList(nodes);
        processVisualStore.setNodeOperation('uploadBool');
        break;
      case 'password':
        nodes[idx].detailPanel[panelType].formDatas[fdIdx].value =
          typeof value === 'object' ? value.text : value;
        nodes[idx].detailPanel[panelType].formDatas[fdIdx].visible =
          typeof value === 'object' ? value.visible : 'yes';
        processVisualStore.setNodeList(nodes);
        processVisualStore.setNodeOperation('uploadPassword');
        break;
      default:
        nodes[idx].detailPanel[panelType].formDatas[fdIdx].value = value;
        processVisualStore.setNodeList(nodes);
        processVisualStore.setNodeOperation('uploadNormal');
        if (field === 'name') nodes[idx].title = value;
        break;
    }
  },
  100,
);

function onCommonChange(field: string, _value: any) {
  debouncedUpdate(field, commonForm.value[field], 'common');
}
function onOptionsChange(field: string, _value: any) {
  debouncedUpdate(field, optionsForm.value[field], 'options');
}

// Judge elementType → determine render component type
function getRenderType(field: any): string {
  return field._renderType || 'text';
}

// Unlink connection (called from external ref)
function unLinkConnection(deleteLinks: any[]) {
  const links = [...linkList.value];
  deleteLinks.forEach((link: any) => {
    plumb.value
      ?.getConnections()
      .filter(
        (c: any) => c.sourceId === link.source && c.targetId === link.target,
      )
      .forEach((line: any) => plumb.value?.deleteConnection(line));
    const idx = links.findIndex((l: any) => l.id === link.id);
    if (idx > -1) links.splice(idx, 1);
  });
  processVisualStore.setLinkList(links);
  processVisualStore.setNodeOperation('delLink');
}

// Cleanup
onUnmounted(() => debouncedUpdate.cancel());

defineExpose({ showCollapse });
</script>

<template>
  <div class="detail-panel-wrapper">
    <!-- Collapse button — always visible when expanded -->
    <div
      v-show="!isCollapse"
      class="collapse-btn collapse-btn-right"
      @click="onCollapse(true)"
    >
      <span>▶</span>
    </div>
    <div
      v-show="isCollapse"
      class="collapse-btn collapse-btn-left"
      @click="onCollapse(false)"
    >
      <span>◀</span>
    </div>

    <div class="detail-panel-container">
      <div class="panel-title">属性配置</div>
      <div class="panel-content">
        <!-- Variable detail -->
        <div
          v-if="activeInfo?.type === 'variable' && activeInfo?.id"
          class="variable-panel"
        >
          <div class="section-title">变量详情</div>
          <el-form label-width="70px" size="small">
            <el-form-item label="名称"
              ><el-input :model-value="variableForm.name" disabled
            /></el-form-item>
            <el-form-item label="类型"
              ><el-tag>{{ variableForm.dataType }}</el-tag></el-form-item
            >
            <el-form-item label="值"
              ><el-input v-model="variableForm.value"
            /></el-form-item>
            <el-form-item label="作用域">
              <el-select v-model="variableForm.scope"
                ><el-option label="流程" value="flow" /><el-option
                  label="全局"
                  value="gFlow"
              /></el-select>
            </el-form-item>
            <el-form-item label="可见性"
              ><el-switch
                v-model="variableForm.visible"
                active-value="yes"
                inactive-value="no"
            /></el-form-item>
          </el-form>
        </div>

        <!-- Node detail -->
        <div v-else-if="showNodePanel && currentNodeId" class="node-panel">
          <!-- Common config -->
          <div v-if="commonRule.length > 0" class="panel-section">
            <div class="section-title">{{ detailPanelTitle.common }}</div>
            <el-form label-width="90px" size="small">
              <el-form-item
                v-for="field in commonRule"
                :key="field.name"
                :label="field.title"
              >
                <!-- textarea / python/js editor -->
                <el-input
                  v-if="getRenderType(field) === 'textarea'"
                  v-model="commonForm[field.name]"
                  type="textarea"
                  :rows="3"
                  @change="onCommonChange(field.name, $event)"
                />
                <!-- input number -->
                <el-input-number
                  v-else-if="getRenderType(field) === 'number'"
                  v-model="commonForm[field.name]"
                  :min="0"
                  size="small"
                  style="width: 100%"
                  @change="onCommonChange(field.name, $event)"
                />
                <!-- password -->
                <el-input
                  v-else-if="getRenderType(field) === 'password'"
                  v-model="commonForm[field.name]"
                  type="password"
                  show-password
                  @change="onCommonChange(field.name, $event)"
                />
                <!-- date -->
                <el-date-picker
                  v-else-if="getRenderType(field) === 'date'"
                  v-model="commonForm[field.name]"
                  type="date"
                  style="width: 100%"
                  @change="onCommonChange(field.name, $event)"
                />
                <!-- select -->
                <el-select
                  v-else-if="getRenderType(field) === 'select'"
                  v-model="commonForm[field.name]"
                  style="width: 100%"
                  @change="onCommonChange(field.name, $event)"
                >
                  <el-option
                    v-for="c in field.choices || []"
                    :key="c.value"
                    :label="c.text"
                    :value="c.value"
                  />
                </el-select>
                <!-- radio (bool) -->
                <el-radio-group
                  v-else-if="getRenderType(field) === 'radio'"
                  v-model="commonForm[field.name]"
                  @change="onCommonChange(field.name, $event)"
                >
                  <el-radio
                    v-for="c in field.choices || []"
                    :key="String(c.value)"
                    :value="c.value"
                    >{{ c.text || (c.value ? '是' : '否') }}</el-radio
                  >
                </el-radio-group>
                <!-- checkbox -->
                <el-checkbox-group
                  v-else-if="getRenderType(field) === 'checkbox'"
                  v-model="commonForm[field.name]"
                  @change="onCommonChange(field.name, $event)"
                >
                  <el-checkbox
                    v-for="c in field.choices || []"
                    :key="c.value"
                    :value="c.value"
                    >{{ c.text }}</el-checkbox
                  >
                </el-checkbox-group>
                <!-- scope checkbox -->
                <el-checkbox-group
                  v-else-if="getRenderType(field) === 'scope'"
                  v-model="commonForm[field.name]"
                  @change="onCommonChange(field.name, $event)"
                >
                  <el-checkbox value="selected">所有流程</el-checkbox>
                </el-checkbox-group>
                <!-- multicheckbox -->
                <el-checkbox-group
                  v-else-if="getRenderType(field) === 'multicheckbox'"
                  v-model="commonForm[field.name]"
                  @change="onCommonChange(field.name, $event)"
                >
                  <el-checkbox
                    v-for="c in field.choices || []"
                    :key="c.value"
                    :value="c.text"
                  />
                </el-checkbox-group>
                <!-- default text input -->
                <el-input
                  v-else
                  v-model="commonForm[field.name]"
                  @change="onCommonChange(field.name, $event)"
                />
              </el-form-item>
            </el-form>
          </div>

          <!-- Options config -->
          <div v-if="optionsRule.length > 0" class="panel-section">
            <div class="section-title">{{ detailPanelTitle.options }}</div>
            <el-form label-width="90px" size="small">
              <el-form-item
                v-for="field in optionsRule"
                :key="field.name"
                :label="field.title"
              >
                <el-input
                  v-if="getRenderType(field) === 'textarea'"
                  v-model="optionsForm[field.name]"
                  type="textarea"
                  :rows="3"
                  @change="onOptionsChange(field.name, $event)"
                />
                <el-select
                  v-else-if="getRenderType(field) === 'select'"
                  v-model="optionsForm[field.name]"
                  style="width: 100%"
                  @change="onOptionsChange(field.name, $event)"
                >
                  <el-option
                    v-for="c in field.choices || []"
                    :key="c.value"
                    :label="c.text"
                    :value="c.value"
                  />
                </el-select>
                <el-radio-group
                  v-else-if="getRenderType(field) === 'radio'"
                  v-model="optionsForm[field.name]"
                  @change="onOptionsChange(field.name, $event)"
                >
                  <el-radio
                    v-for="c in field.choices || []"
                    :key="String(c.value)"
                    :value="c.value"
                    >{{ c.text || (c.value ? '是' : '否') }}</el-radio
                  >
                </el-radio-group>
                <el-input-number
                  v-else-if="getRenderType(field) === 'number'"
                  v-model="optionsForm[field.name]"
                  :min="0"
                  size="small"
                  style="width: 100%"
                  @change="onOptionsChange(field.name, $event)"
                />
                <el-input
                  v-else
                  v-model="optionsForm[field.name]"
                  @change="onOptionsChange(field.name, $event)"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-panel">
          <div class="empty-text">选择节点或变量查看属性</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-panel-wrapper {
  height: 100%;
  position: relative;
}
.detail-panel-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  position: relative;
  overflow: hidden;
}
.panel-title {
  padding: 12px;
  border-bottom: 1px solid #eeeff1;
  font-size: 14px;
  font-weight: 500;
}
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  position: relative;
}
.collapse-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 16px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(210 213 221 / 50%);
  cursor: pointer;
  font-size: 10px;
  color: #fff;
  border-radius: 2px;
  transition: background 0.2s;
}
.collapse-btn:hover {
  background: rgb(210 213 221 / 80%);
}
.collapse-btn-right {
  left: -16px;
}
.collapse-btn-left {
  left: -16px;
}
.panel-section {
  margin-bottom: 16px;
}
.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}
.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}
.empty-text {
  font-size: 13px;
  color: #909399;
}
.variable-panel,
.node-panel {
  padding-top: 4px;
}
</style>
