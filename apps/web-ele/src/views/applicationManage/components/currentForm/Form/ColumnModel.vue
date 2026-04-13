<script lang="ts" setup>
import { QuestionFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import SubmitForm from '#/components/SubmitForm/index.vue';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';

import { buildColumnModelBaseColumns, buildControlTypeObj } from './column-model-config';
import ViewRegex from './ViewRegex.vue';

const CM_RULE = 'applicationManage.currentForm.columnModel.rule';
const ruleMsg = (k: string) => $t(`${CM_RULE}.${k}`);

const emit = defineEmits<{
  (e: 'editInfo', data: Record<string, any>): void;
}>();

const assetEnumsStore = useAssetEnumsStore();
const submitFormRef = ref<InstanceType<typeof SubmitForm>>();
const viewRegexRef = ref<InstanceType<typeof ViewRegex>>();
const visible = ref(false);
const confirmLoading = ref(false);
const columnsForm = ref<Record<string, any>[]>([]);
const colunmsDefault = ref<Record<string, any>[]>([]);
const controlTypeMap = ref<Record<string, Record<string, any>[]>>({});

const submitData = reactive<Record<string, any>>({});

const selectObj = reactive<{ name: string; content: string }>({
  name: '',
  content: '',
});

const optionDragIndex = ref(-1);

const dictInfoList = computed(() => {
  const raw = assetEnumsStore.enums as Record<string, any>;
  return Object.keys(raw || {})
    .map((key) => {
      const el = raw[key];
      if (!Array.isArray(el?.children) || !el.children.length) return null;
      return {
        label: String(el.content ?? el.name ?? key),
        value: key,
        options: el.children,
      };
    })
    .filter(Boolean) as { label: string; value: string; options: any[] }[];
});

const extraRules = computed(() => {
  const r: Record<string, any> = {};
  const ds = submitData.dataSources;
  if (submitData.type === 'select') {
    if (ds === 2) {
      r.httpUrl = [{ required: true, message: ruleMsg('enterApiUrl'), trigger: 'blur' }];
      r.httpMethods = [{ required: true, message: ruleMsg('enterHttpMethod'), trigger: 'blur' }];
      r.returnDataFormat = [{ required: true, message: ruleMsg('enterImportDataPath'), trigger: 'blur' }];
      r.labelKey = [{ required: true, message: ruleMsg('enterLabelKey'), trigger: 'blur' }];
      r.valueKey = [{ required: true, message: ruleMsg('enterValueKey'), trigger: 'blur' }];
    }
    if (ds === 1) {
      r.dicKey = [{ required: true, message: ruleMsg('selectEnum'), trigger: 'change' }];
    }
    if (ds === 0) {
      r.options = [{ required: true, message: ruleMsg('addDataSource'), trigger: 'change' }];
    }
  }
  if (submitData.type === 'textarea' && submitData.textareaUpload) {
    r.httpUrlTemp = [{ required: true, message: ruleMsg('enterTemplateApi'), trigger: 'blur' }];
    r.httpMethodsTemp = [{ required: true, message: ruleMsg('enterTemplateMethod'), trigger: 'blur' }];
    r.httpUrl = [{ required: true, message: ruleMsg('enterImportApi'), trigger: 'blur' }];
    r.httpMethods = [{ required: true, message: ruleMsg('enterImportMethod'), trigger: 'blur' }];
    r.returnDataFormat = [{ required: true, message: ruleMsg('enterImportDataPath'), trigger: 'blur' }];
    r.fileFormat = [{ required: true, message: ruleMsg('enterFileType'), trigger: 'blur' }];
  }
  return r;
});

function createRandomNumber() {
  const randomNum = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `${Date.now()}-${randomNum}`;
}

function refreshTemplates() {
  const encodingRoot = assetEnumsStore.getEnumByKey<any>('ENCODING');
  const encodingChildren = Array.isArray(encodingRoot?.children) ? encodingRoot.children : [];
  controlTypeMap.value = buildControlTypeObj(encodingChildren, $t);
  const base = buildColumnModelBaseColumns($t);
  base.forEach((el: any) => {
    if (el.prop === 'type') {
      el.change = (v: string) => typeEvent(v);
    }
    if (el.prop === 'multiModal') {
      el.change = (v: boolean) => multiModalEvent(v);
    }
  });
  colunmsDefault.value = base.map((c) => ({ ...c }));
}

function typeEvent(type?: string) {
  let defaultVal: Record<string, any> = {};
  let merged = colunmsDefault.value.map((el) => ({ ...el }));
  colunmsDefault.value.forEach((el) => {
    if (![undefined, null, ''].includes(submitData[el.prop])) {
      defaultVal[el.prop] = submitData[el.prop];
    }
  });
  if (type && controlTypeMap.value[type]) {
    const tempColumns = controlTypeMap.value[type].map((c) => ({ ...c }));
    tempColumns.forEach((el) => {
      if (![undefined, null, ''].includes(el.defaultValue)) {
        defaultVal[el.prop] = el.defaultValue;
      }
    });
    merged = [...merged, ...tempColumns];
  }
  Object.assign(submitData, {
    ...defaultVal,
    currentId: submitData.currentId,
  });
  columnsForm.value = merged;
}

function multiModalEvent(val: boolean) {
  columnsForm.value.forEach((el) => {
    if (el.prop === 'multiModalShow') {
      el.show = !!val;
      submitData[el.prop] = el.defaultValue;
    }
  });
}

function closeFn() {
  visible.value = false;
  submitFormRef.value?.clearValidate?.();
  columnsForm.value = colunmsDefault.value.map((c) => ({ ...c }));
}

function open(params: Record<string, any> = {}) {
  refreshTemplates();
  const mergedBase = colunmsDefault.value.map((el) => {
    if (el.prop === 'multiModalShow') {
      return { ...el, show: !!params?.multiModal };
    }
    return { ...el };
  });
  colunmsDefault.value = mergedBase;

  const defaultVal: Record<string, any> = {};
  colunmsDefault.value.forEach((el) => {
    if (![undefined, null, ''].includes(el.defaultValue)) {
      defaultVal[el.prop] = el.defaultValue;
    }
  });

  Object.keys(submitData).forEach((k) => delete submitData[k]);
  Object.assign(submitData, defaultVal);

  if (params?.prop) {
    typeEvent(params.type);
  } else {
    typeEvent(undefined);
  }

  nextTick(() => {
    Object.assign(submitData, params);
    visible.value = true;
    setTimeout(() => submitFormRef.value?.clearValidate?.(), 200);
  });
}

async function submitFn() {
  confirmLoading.value = true;
  try {
    const valid = await submitFormRef.value?.validateFn?.();
    if (!valid) return;
    const data: Record<string, any> = {
      ...submitData,
      disabled: true,
    };
    if (!data.currentId) {
      data.currentId = createRandomNumber();
    }
    if (data.type === 'select') {
      const commonProperties = ['httpUrl', 'httpMethods', 'returnDataFormat', 'labelKey', 'valueKey'];
      let propertiesToDelete: string[] = [];
      switch (data.dataSources) {
        case 0:
          propertiesToDelete = [...commonProperties, 'dicKey', 'dictOptions'];
          break;
        case 1:
          propertiesToDelete = [...commonProperties, 'options'];
          break;
        case 2:
          propertiesToDelete = ['options', 'dicKey', 'dictOptions'];
          break;
        default:
          break;
      }
      propertiesToDelete.forEach((prop) => {
        delete data[prop];
      });
    }
    emit('editInfo', data);
  } finally {
    confirmLoading.value = false;
  }
}

function radioGroupChange() {
  const commonProperties = ['httpUrl', 'httpMethods', 'returnDataFormat', 'labelKey', 'valueKey'];
  let propertiesToDelete: string[] = [];
  const v = submitData.dataSources;
  switch (v) {
    case 0:
      propertiesToDelete = [...commonProperties, 'dicKey', 'dictOptions'];
      break;
    case 1:
      propertiesToDelete = [...commonProperties, 'options'];
      break;
    case 2:
      propertiesToDelete = ['options', 'dicKey', 'dictOptions'];
      break;
    default:
      break;
  }
  propertiesToDelete.forEach((prop) => submitFormRef.value?.clearValidate?.(prop));
}

function onDictChange(val: string) {
  const row = dictInfoList.value.find((e) => e.value === val);
  submitData.dictOptions = row?.options || [];
}

function delOption(index: number) {
  if (!Array.isArray(submitData.options)) return;
  submitData.options.splice(index, 1);
}

function pressEnter() {
  const { name, content } = selectObj;
  if (!name || !content) return;
  if (!Array.isArray(submitData.options)) {
    submitData.options = [];
  }
  const dup = submitData.options.some((item: any) => item.name === name || item.content === content);
  if (dup) {
    ElMessage.warning($t('applicationManage.currentForm.columnModel.duplicateOption'));
    return;
  }
  submitData.options.push({ name, content });
  selectObj.name = '';
  selectObj.content = '';
}

function onOptionDragStart(index: number) {
  optionDragIndex.value = index;
}

function onOptionDrop(index: number) {
  if (optionDragIndex.value < 0 || optionDragIndex.value === index) return;
  const list = submitData.options;
  if (!Array.isArray(list)) return;
  const next = [...list];
  const [moved] = next.splice(optionDragIndex.value, 1);
  if (!moved) return;
  next.splice(index, 0, moved);
  submitData.options = next;
  optionDragIndex.value = -1;
}

onMounted(async () => {
  await assetEnumsStore.ensureAssetEnumsLoaded();
  refreshTemplates();
});

function viewRegex() {
  viewRegexRef.value?.open();
}

defineExpose({
  open,
  closeFn,
});
</script>

<template>
  <div v-show="visible" class="column-model">
    <SubmitForm
      ref="submitFormRef"
      :base-form="submitData"
      :columns="columnsForm"
      :rules="extraRules"
      label-width="120px"
    >
      <template #customInput="{ rowData }">
        <div v-if="rowData.prop === 'regex'" class="regex-row">
          <el-input
            v-model="submitData.regex"
            :placeholder="$t('applicationManage.currentForm.common.pleaseEnter')"
            maxlength="500"
            clearable
          />
          <el-tooltip :content="$t('applicationManage.currentForm.viewRegex.title')" placement="top">
            <el-icon class="tip" @click.stop="viewRegex"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <template #dataSources="{ rowData }">
        <el-radio-group
          v-model="submitData[rowData.prop]"
          class="block-radio"
          @change="radioGroupChange"
        >
          <el-radio-button v-for="op in rowData.options || []" :key="op.value" :value="op.value">
            {{ op.label }}
          </el-radio-button>
        </el-radio-group>

        <template v-if="submitData[rowData.prop] === 2">
          <el-form-item prop="httpUrl" class="mt10">
            <el-input
              v-model="submitData.httpUrl"
              :placeholder="$t('applicationManage.currentForm.columnModel.placeholderApiUrl')"
              clearable
            />
          </el-form-item>
          <el-form-item prop="httpMethods">
            <el-input
              v-model="submitData.httpMethods"
              :placeholder="$t('applicationManage.currentForm.columnModel.placeholderHttpMethod')"
              clearable
            />
          </el-form-item>
          <el-form-item prop="returnDataFormat">
            <el-input
              v-model="submitData.returnDataFormat"
              :placeholder="$t('applicationManage.currentForm.columnModel.placeholderDataPath')"
              clearable
            />
          </el-form-item>
          <div class="pair-row">
            <el-form-item prop="labelKey" class="pair-item">
              <el-input
                v-model="submitData.labelKey"
                :placeholder="$t('applicationManage.currentForm.columnModel.placeholderLabelKey')"
                clearable
              />
            </el-form-item>
            <span class="colon">:</span>
            <el-form-item prop="valueKey" class="pair-item">
              <el-input
                v-model="submitData.valueKey"
                :placeholder="$t('applicationManage.currentForm.columnModel.placeholderValueKey')"
                clearable
              />
            </el-form-item>
          </div>
        </template>

        <template v-else-if="submitData[rowData.prop] === 1">
          <el-form-item prop="dicKey" class="mt10">
            <el-select
              v-model="submitData.dicKey"
              :placeholder="$t('applicationManage.currentForm.columnModel.placeholderSelectEnum')"
              clearable
              filterable
              style="width: 100%"
              @change="onDictChange"
            >
              <el-option
                v-for="op in dictInfoList"
                :key="op.value"
                :label="op.label"
                :value="op.value"
              />
            </el-select>
          </el-form-item>
          <div
            v-for="item in submitData.dictOptions || []"
            :key="item.name"
            class="dict-preview"
          >
            <span>{{ item.content }}</span>
            <span class="colon">:</span>
            <span>{{ item.name }}</span>
          </div>
        </template>

        <template v-else>
          <div
            v-for="(item, index) in submitData.options || []"
            :key="`${item.name}-${index}`"
            class="option-row"
            draggable="true"
            @dragstart="onOptionDragStart(index)"
            @dragover.prevent
            @drop="onOptionDrop(index)"
          >
            <span>{{ item.content }}</span>
            <span class="colon">:</span>
            <span>{{ item.name }}</span>
            <el-button link type="danger" class="del-opt" @click="delOption(index)">
              {{ $t('applicationManage.currentForm.common.delete') }}
            </el-button>
          </div>
          <el-form-item prop="options" class="mb0">
            <div class="option-row">
              <el-input
                v-model="selectObj.content"
                :placeholder="$t('applicationManage.currentForm.columnModel.placeholderDisplayName')"
                @blur="pressEnter"
                @keyup.enter="pressEnter"
              />
              <span class="colon">:</span>
              <el-input
                v-model="selectObj.name"
                :placeholder="$t('applicationManage.currentForm.columnModel.placeholderDataValue')"
                @blur="pressEnter"
                @keyup.enter="pressEnter"
              />
            </div>
          </el-form-item>
        </template>
      </template>

      <!-- 对齐 social_media_web ColumnModel textareaUpload：仅占位符 + 行内输入与问号，无右侧常驻说明 -->
      <template #textareaUpload="{ rowData }">
        <div class="textarea-upload-root">
          <el-radio-group v-model="submitData[rowData.prop]" class="block-radio" @change="radioGroupChange">
            <el-radio-button v-for="op in rowData.options || []" :key="String(op.value)" :value="op.value">
              {{ op.label }}
            </el-radio-button>
          </el-radio-group>

          <template v-if="submitData[rowData.prop]">
            <!-- 不用 el-divider：避免横线与标题字体重叠；样式对齐旧版分区标题 -->
            <div class="import-block-title">
              {{ $t('applicationManage.currentForm.columnModel.dividerImportTemplate') }}
            </div>
            <el-form-item prop="httpUrlTemp" label-width="0" class="import-flex-form-item">
              <div class="import-flex-row">
                <div class="import-flex-input-wrap">
                  <el-input
                    v-model="submitData.httpUrlTemp"
                    :placeholder="$t('applicationManage.currentForm.columnModel.placeholderApiUrl')"
                    clearable
                  />
                </div>
                <div class="import-flex-trail">
                  <el-tooltip placement="bottom-start" :show-after="200">
                    <template #content>
                      {{ $t('applicationManage.currentForm.columnModel.tip.importExpectJsonApi') }}
                    </template>
                    <el-icon class="import-tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </div>
            </el-form-item>
            <el-form-item prop="httpMethodsTemp" label-width="0" class="import-flex-form-item">
              <div class="import-flex-row">
                <div class="import-flex-input-wrap">
                  <el-input
                    v-model="submitData.httpMethodsTemp"
                    :placeholder="$t('applicationManage.currentForm.columnModel.importBlockRequestMethod')"
                    clearable
                  />
                </div>
                <div class="import-flex-trail import-flex-trail--spacer" aria-hidden="true" />
              </div>
            </el-form-item>

            <div class="import-block-title import-block-title--follow">
              {{ $t('applicationManage.currentForm.columnModel.dividerImportApi') }}
            </div>
            <el-form-item prop="httpUrl" label-width="0" class="import-flex-form-item">
              <div class="import-flex-row">
                <div class="import-flex-input-wrap">
                  <el-input
                    v-model="submitData.httpUrl"
                    :placeholder="$t('applicationManage.currentForm.columnModel.placeholderApiUrl')"
                    clearable
                  />
                </div>
                <div class="import-flex-trail">
                  <el-tooltip placement="bottom-start" :show-after="200">
                    <template #content>
                      {{ $t('applicationManage.currentForm.columnModel.tip.importExpectJsonApi') }}
                    </template>
                    <el-icon class="import-tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </div>
            </el-form-item>
            <el-form-item prop="httpMethods" label-width="0" class="import-flex-form-item">
              <div class="import-flex-row">
                <div class="import-flex-input-wrap">
                  <el-input
                    v-model="submitData.httpMethods"
                    :placeholder="$t('applicationManage.currentForm.columnModel.importBlockRequestMethod')"
                    clearable
                  />
                </div>
                <div class="import-flex-trail import-flex-trail--spacer" aria-hidden="true" />
              </div>
            </el-form-item>
            <el-form-item prop="returnDataFormat" label-width="0" class="import-flex-form-item">
              <div class="import-flex-row">
                <div class="import-flex-input-wrap">
                  <el-input
                    v-model="submitData.returnDataFormat"
                    :placeholder="$t('applicationManage.currentForm.columnModel.importBlockDataset')"
                    clearable
                  />
                </div>
                <div class="import-flex-trail">
                  <el-tooltip placement="bottom-start" :show-after="200" popper-class="import-dataset-tooltip">
                    <template #content>
                      <div class="import-dataset-tip-popper">
                        <span>{{ $t('applicationManage.currentForm.columnModel.tip.importParseDatasetTitle') }}</span>
                        <br />
                        <pre class="import-dataset-pre-popper">{{
                          $t('applicationManage.currentForm.columnModel.tip.importParseDatasetExample')
                        }}</pre>
                        <span>{{ $t('applicationManage.currentForm.columnModel.tip.importParseDatasetHint') }}</span>
                      </div>
                    </template>
                    <el-icon class="import-tip-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </div>
            </el-form-item>
            <el-form-item prop="fileFormat" label-width="0" class="import-flex-form-item">
              <div class="import-flex-row">
                <div class="import-flex-input-wrap">
                  <el-input
                    v-model="submitData.fileFormat"
                    :placeholder="$t('applicationManage.currentForm.columnModel.importBlockFilePlaceholder')"
                    clearable
                  />
                </div>
                <div class="import-flex-trail import-flex-trail--spacer" aria-hidden="true" />
              </div>
            </el-form-item>
          </template>
        </div>
      </template>
    </SubmitForm>

    <div class="btn-box">
      <el-button class="btn-block" @click="closeFn">
        {{ $t('applicationManage.currentForm.common.cancel') }}
      </el-button>
      <el-button class="btn-block" type="primary" :loading="confirmLoading" @click="submitFn">
        {{
          submitData.currentId
            ? $t('applicationManage.currentForm.common.update')
            : $t('applicationManage.currentForm.common.add')
        }}
      </el-button>
    </div>

    <ViewRegex ref="viewRegexRef" />
  </div>
</template>

<style scoped>
.column-model {
  min-width: 0;
}

.column-model :deep(.el-form-item) {
  margin-bottom: 14px;
}

.regex-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.regex-row .tip {
  flex-shrink: 0;
  color: var(--el-color-danger);
  cursor: pointer;
}

.block-radio {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.mt10 {
  margin-top: 10px;
}

.mb0 {
  margin-bottom: 0;
}

.pair-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pair-item {
  flex: 1;
  margin-bottom: 0 !important;
}

.colon {
  padding-top: 6px;
  color: var(--el-text-color-secondary);
}

.dict-preview,
.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.option-row {
  cursor: move;
}

.del-opt {
  margin-left: auto;
}

/* 对齐旧版 Ant ColumnModel：两个 block 按钮横向等分（参考图二 取消 + 主色按钮） */
.btn-box {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color);
  width: 100%;
  box-sizing: border-box;
}

.btn-box .btn-block {
  flex: 1;
  margin: 0 !important;
  height: 40px;
  border-radius: 2px;
  font-size: 14px;
}

.btn-box .btn-block:not(.el-button--primary) {
  color: var(--el-text-color-regular);
  background: var(--el-bg-color);
  border-color: var(--el-border-color);
}

.btn-box .btn-block:not(.el-button--primary):hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.textarea-upload-root {
  width: 100%;
}

/* 替代 el-divider：横线不穿过文字，也不与上一项校验提示重叠 */
.import-block-title {
  margin: 12px 0 8px;
  padding-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.import-block-title--follow {
  margin-top: 22px;
}

/* 对齐旧版 Ant `.flex`：第二列固定 22px，无问号时占位，保证各行输入框等宽 */
.import-flex-form-item {
  width: 100%;
}

.import-flex-form-item :deep(.el-form-item__content) {
  display: block;
  width: 100%;
  margin-left: 0 !important;
  justify-content: flex-start;
}

.import-flex-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 22px;
  column-gap: 8px;
  align-items: center;
  width: 100%;
}

.import-flex-input-wrap {
  min-width: 0;
  width: 100%;
}

.import-flex-input-wrap :deep(.el-input) {
  width: 100%;
}

.import-flex-trail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  flex-shrink: 0;
}

.import-flex-trail--spacer {
  pointer-events: none;
}

.import-tip-icon {
  color: var(--el-color-danger);
  cursor: help;
  font-size: 16px;
}
</style>

<!-- tooltip 挂载到 body，需非 scoped 才能限制浮层宽度 -->
<style>
.import-dataset-tooltip {
  max-width: 380px;
}

.import-dataset-tooltip .import-dataset-tip-popper {
  line-height: 1.5;
  font-size: 13px;
}

.import-dataset-tooltip .import-dataset-pre-popper {
  margin: 8px 0;
  font-size: 12px;
  white-space: pre-wrap;
  font-family: ui-monospace, monospace;
}
</style>
