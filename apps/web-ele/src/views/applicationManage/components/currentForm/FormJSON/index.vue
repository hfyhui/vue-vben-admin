<script lang="ts" setup>
import { computed, ref } from 'vue';

import { ElMessage } from 'element-plus';

import { $t } from '#/locales';

const FJ = 'applicationManage.currentForm.formJson';

const props = withDefaults(
  defineProps<{
    modelValue?: Record<string, any>[];
    extColumns?: Record<string, any>[];
  }>(),
  {
    modelValue: () => [],
    extColumns: () => [],
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>[]): void;
  (e: 'update:extColumns', value: Record<string, any>[]): void;
}>();

const isEdit = ref(false);
const textJSON = ref('');
const formattedJson = ref('');
const errorMessage = ref('');

const currentValue = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  },
  set(value) {
    emit('update:modelValue', Array.isArray(value) ? value : []);
  },
});

const extList = computed<Record<string, any>[]>({
  get() {
    return Array.isArray(props.extColumns) ? props.extColumns : [];
  },
  set(value) {
    emit('update:extColumns', Array.isArray(value) ? value : []);
  },
});

const displayText = computed(() =>
  currentValue.value.length ? JSON.stringify(currentValue.value) : '',
);

function createRandomNumber() {
  const randomNum = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `${Date.now()}-${randomNum}`;
}

/** 对齐旧版 hasDuplicateLabelOrValue，返回重复项明细 */
function hasDuplicateLabelOrValue(array: Record<string, any>[]) {
  const labelSet = new Set<string>();
  const propSet = new Set<string>();
  const reportedLabels = new Set<string>();
  const reportedProps = new Set<string>();
  const duplicatesLabel: string[] = [];
  const duplicatesProp: string[] = [];
  let hasDuplicates = false;

  for (const item of array) {
    if (item.label !== undefined && item.label !== null) {
      const lb = String(item.label);
      if (labelSet.has(lb)) {
        if (!reportedLabels.has(lb)) {
          duplicatesLabel.push(lb);
          reportedLabels.add(lb);
          hasDuplicates = true;
        }
      } else {
        labelSet.add(lb);
      }
    }
    if (item.prop !== undefined && item.prop !== null) {
      const p = String(item.prop);
      if (propSet.has(p)) {
        if (!reportedProps.has(p)) {
          duplicatesProp.push(p);
          reportedProps.add(p);
          hasDuplicates = true;
        }
      } else {
        propSet.add(p);
      }
    }
  }

  return {
    hasDuplicates,
    duplicatesLabel,
    duplicatesProp,
  };
}

function openEditEvent(open: boolean) {
  if (open) {
    textJSON.value = currentValue.value.length ? JSON.stringify(currentValue.value, null, 2) : '';
  } else {
    textJSON.value = '';
  }
  isEdit.value = open;
  errorMessage.value = '';
  formattedJson.value = '';
}

function formatJSON(type: 'format' | 'save') {
  try {
    const hasText = textJSON.value.trim().length > 0;

    if (type === 'format') {
      if (!hasText) return;
      const parsedJson = JSON.parse(textJSON.value) as unknown;
      formattedJson.value = JSON.stringify(parsedJson, null, 2);
      errorMessage.value = '';
      return;
    }

    // save（对齐旧版：空内容则清空表单，并保留无 currentId 的扩展列）
    if (!hasText) {
      currentValue.value = [];
      const extKept = extList.value.filter((el) => !el.currentId);
      extList.value = [...extKept];
      isEdit.value = false;
      errorMessage.value = '';
      formattedJson.value = '';
      ElMessage.success($t(`${FJ}.saveSuccess`));
      return;
    }

    const raw = JSON.parse(textJSON.value) as unknown;
    if (!Array.isArray(raw)) {
      ElMessage.error($t(`${FJ}.mustBeArray`));
      return;
    }

    const list: Record<string, any>[] = raw.map((el: Record<string, any>) => {
      const row = { ...el };
      row.currentId = createRandomNumber();
      return row;
    });

    const duplicate = hasDuplicateLabelOrValue(list);
    if (duplicate.hasDuplicates) {
      let str = '';
      if (duplicate.duplicatesLabel.length) {
        str += $t(`${FJ}.labelPrefix`) + duplicate.duplicatesLabel.join($t(`${FJ}.listSep`));
      }
      if (duplicate.duplicatesProp.length) {
        str +=
          (str.length ? $t(`${FJ}.listJoin`) : '') +
          $t(`${FJ}.propPrefix`) +
          duplicate.duplicatesProp.join($t(`${FJ}.listSep`));
      }
      ElMessage.error($t(`${FJ}.saveFailedDuplicate`, { detail: str }));
      return;
    }

    currentValue.value = list;
    const extKept = extList.value.filter((el) => !el.currentId);
    extList.value = [...list, ...extKept];

    isEdit.value = false;
    errorMessage.value = '';
    formattedJson.value = '';
    ElMessage.success($t(`${FJ}.saveSuccess`));
  } catch (error: unknown) {
    const msg =
      error && typeof error === 'object' && 'message' in error
        ? String((error as Error).message)
        : String(error);
    errorMessage.value = msg;
    formattedJson.value = '';
    ElMessage.error($t(`${FJ}.jsonInvalid`));
  }
}
</script>

<template>
  <div class="form-json-wrap">
    <template v-if="isEdit">
      <div class="btn-box">
        <el-button @click="openEditEvent(false)">
          {{ $t('applicationManage.currentForm.common.cancel') }}
        </el-button>
        <el-button type="primary" @click="formatJSON('format')">
          {{ $t('applicationManage.currentForm.formJson.formatJson') }}
        </el-button>
        <el-button type="success" @click="formatJSON('save')">
          {{ $t('applicationManage.currentForm.common.save') }}
        </el-button>
      </div>
      <el-input
        v-model="textJSON"
        type="textarea"
        :autosize="{ minRows: 15, maxRows: 30 }"
        class="json-textarea"
      />
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <pre v-else class="pre">{{ formattedJson }}</pre>
    </template>
    <template v-else>
      <el-tooltip placement="top-start" :content="$t('applicationManage.currentForm.formJson.editTooltip')">
        <el-button type="primary" @click="openEditEvent(true)">
          {{ $t('applicationManage.currentForm.common.edit') }}
        </el-button>
      </el-tooltip>
      <div class="text-box">{{ displayText }}</div>
    </template>
  </div>
</template>

<style scoped>
.form-json-wrap {
  width: 100%;
}

.json-textarea {
  width: 100%;
}

.pre {
  line-height: 1.4;
  margin-top: 10px;
  background-color: var(--el-fill-color-light);
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.error-message {
  color: var(--el-color-danger);
  margin-top: 10px;
  margin-bottom: 10px;
}

.btn-box {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.text-box {
  width: 100%;
  margin-top: 8px;
  padding: 4px 11px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  line-height: 1.5;
  min-height: 324.6px;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #fff;
}
</style>
