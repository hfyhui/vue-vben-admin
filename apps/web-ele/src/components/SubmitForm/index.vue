<script lang="ts" setup>
import { computed, ref } from 'vue';

import { QuestionFilled } from '@element-plus/icons-vue';

import ImageUpload from '#/components/ImageUpload.vue';

type OptionItem = Record<string, any>;

type FormColumn = {
  type?:
    | 'input'
    | 'select'
    | 'checkbox'
    | 'checkboxGroup'
    | 'radio'
    | 'date'
    | 'autoComplete'
    | 'switch'
    | 'textarea'
    | 'inputNumber'
    | 'password'
    | 'uploadImg'
    | 'uploadVideo'
    | 'uploadFile'
    | 'customInput'
    | 'customAll';
  label?: string;
  prop: string;
  slot?: string;
  show?: boolean;
  class?: string;
  controlTip?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: OptionItem[];
  valueKey?: string;
  labelKey?: string;
  clearable?: boolean;
  allowClear?: boolean;
  multiple?: boolean;
  mode?: string;
  showSearch?: boolean;
  maxTagCount?: number;
  filterable?: boolean;
  disabled?: boolean;
  buttonStyle?: boolean;
  dateFormat?: string;
  valueFormat?: string;
  showTime?: boolean;
  disabledDate?: (date: Date) => boolean;
  disabledTime?: (date: Date) => any;
  checkedChildren?: string;
  unCheckedChildren?: string;
  loading?: boolean;
  size?: 'default' | 'large' | 'small';
  autoSize?: boolean | { minRows?: number; maxRows?: number };
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  unit?: string;
  autocomplete?: string;
  fileFormat?: string;
  maxSize?: number | string;
  change?: (value: any, item: FormColumn) => void;
  searchFn?: (value: string, item: FormColumn) => void;
  selectFn?: (value: string, item: FormColumn, option?: any) => void;
  pressEnter?: () => void;
  filterOption?: (query: string, option: OptionItem, item: FormColumn) => boolean;
  showCharCounter?: boolean;
};

const props = withDefaults(
  defineProps<{
    columns?: FormColumn[];
    baseForm: Record<string, any>;
    rules?: Record<string, any>;
    labelWidth?: string | number;
  }>(),
  {
    columns: () => [],
    rules: () => ({}),
    labelWidth: '120px',
  },
);

const submitFormRef = ref();

function formatParamsTrim(value?: string) {
  return typeof value === 'string' ? value.trim() : value;
}

function formatterPlaceholder(item: FormColumn) {
  if (item.disabled) return '';
  if (item.placeholder) return item.placeholder;
  const selectTypes = ['select', 'radio', 'checkbox', 'checkboxGroup', 'date'];
  return selectTypes.includes(item.type || '') ? '请选择' : '请输入';
}

function getOptionValue(item: FormColumn, option: OptionItem) {
  return option?.[item.valueKey || 'value'];
}

function getOptionLabel(item: FormColumn, option: OptionItem) {
  return option?.[item.labelKey || 'label'];
}

function onFieldChange(item: FormColumn, value: any) {
  item.change?.(value, item);
}

function onSearch(item: FormColumn, value: string) {
  item.searchFn?.(value, item);
}

function onSelect(item: FormColumn, value: string) {
  item.selectFn?.(value, item);
}

function onUploadChange(item: FormColumn, value: string) {
  props.baseForm[item.prop] = value;
  validateField([item.prop]);
  onFieldChange(item, value);
}

function getSelectFilterMethod(item: FormColumn) {
  if (item.filterOption) {
    return (query: string) => {
      const list = item.options || [];
      return list.some((op) => item.filterOption?.(query, op, item));
    };
  }
  return undefined;
}

const selectModes = computed(() => {
  const map: Record<string, 'multiple' | undefined> = {};
  (props.columns || []).forEach((item) => {
    const isMultiple = item.mode === 'multiple' || item.multiple;
    map[item.prop] = isMultiple ? 'multiple' : undefined;
  });
  return map;
});

const autoCompleteSuggestions = computed<Record<string, OptionItem[]>>(() => {
  const ret: Record<string, OptionItem[]> = {};
  (props.columns || []).forEach((item) => {
    if (item.type === 'autoComplete') {
      ret[item.prop] = item.options || [];
    }
  });
  return ret;
});

function queryAutoComplete(item: FormColumn, queryString: string, cb: (arg: any[]) => void) {
  const source = (autoCompleteSuggestions.value[item.prop] || []).map((op) => ({
    value: String(getOptionValue(item, op) ?? ''),
    label: String(getOptionLabel(item, op) ?? ''),
    raw: op,
  }));
  onSearch(item, queryString);
  if (!queryString) {
    cb(source);
    return;
  }
  const keyword = queryString.toLowerCase();
  cb(source.filter((s) => s.value.toLowerCase().includes(keyword) || s.label.toLowerCase().includes(keyword)));
}

async function validateFn() {
  try {
    await submitFormRef.value?.validate?.();
    return true;
  } catch {
    return false;
  }
}

function validateField(field: string | string[]) {
  submitFormRef.value?.validateField?.(field);
}

function clearValidate(field?: string | string[]) {
  submitFormRef.value?.clearValidate?.(field);
}

function reset() {
  submitFormRef.value?.resetFields?.();
  (props.columns || []).forEach((el) => {
    if (![null, undefined, ''].includes(el.defaultValue)) {
      props.baseForm[el.prop] = el.defaultValue;
    }
  });
}

defineExpose({
  formatParamsTrim,
  validateFn,
  validateField,
  clearValidate,
  reset,
  formatterPlaceholder,
});
</script>

<template>
  <el-form ref="submitFormRef" :model="baseForm" :rules="rules" :label-width="labelWidth" class="submit-form">
    <template v-for="item in columns">
      <div
        v-if="item.show !== false && item.type === 'customAll' && item.slot"
        :key="`${item.prop}-all`"
        class="submit-form-custom-all"
      >
        <slot :name="item.slot" :rowData="item"></slot>
      </div>
      <el-form-item
        v-else-if="item.show !== false"
        :key="`${item.prop}-item`"
        :prop="item.prop"
        :rules="(item as any).rules"
        :class="item.class"
      >
        <template #label>
          <span class="label-box">
            {{ item.label }}
            <el-tooltip v-if="item.controlTip" :content="item.controlTip" placement="top">
              <el-icon class="tip-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>

        <template v-if="item.type === 'customInput' && item.slot">
          <slot :name="item.slot" :rowData="item"></slot>
        </template>

        <ImageUpload
          v-else-if="['uploadImg', 'uploadVideo', 'uploadFile'].includes(item.type || '')"
          :model-value="baseForm[item.prop]"
          :file-format="item.fileFormat || '.jpg,.jpeg,.png,.bmp,.gif'"
          :file-size="item.maxSize || 5120"
          @update:model-value="(val: string) => onUploadChange(item, val)"
          @change="(val: string) => onUploadChange(item, val)"
        />

        <el-radio-group
          v-else-if="item.type === 'radio'"
          v-model="baseForm[item.prop]"
          :disabled="!!item.disabled"
          @change="(val: any) => onFieldChange(item, val)"
        >
          <template v-if="item.buttonStyle">
            <el-radio-button
              v-for="op in item.options || []"
              :key="String(getOptionValue(item, op))"
              :value="getOptionValue(item, op)"
              :disabled="!!op.disabled"
            >
              {{ getOptionLabel(item, op) }}
            </el-radio-button>
          </template>
          <template v-else>
            <el-radio
              v-for="op in item.options || []"
              :key="String(getOptionValue(item, op))"
              :value="getOptionValue(item, op)"
              :disabled="!!op.disabled"
            >
              {{ getOptionLabel(item, op) }}
            </el-radio>
          </template>
        </el-radio-group>

        <el-checkbox-group
          v-else-if="item.type === 'checkbox' || item.type === 'checkboxGroup'"
          v-model="baseForm[item.prop]"
          :disabled="!!item.disabled"
          @change="(val: any) => onFieldChange(item, val)"
        >
          <el-checkbox
            v-for="op in item.options || []"
            :key="String(getOptionValue(item, op))"
            :value="getOptionValue(item, op)"
            :disabled="!!op.disabled"
          >
            {{ getOptionLabel(item, op) }}
          </el-checkbox>
        </el-checkbox-group>

        <el-select
          v-else-if="item.type === 'select'"
          v-model="baseForm[item.prop]"
          :placeholder="formatterPlaceholder(item)"
          :clearable="item.allowClear !== false && item.clearable !== false"
          :filterable="item.showSearch !== false && item.filterable !== false"
          :multiple="selectModes[item.prop] === 'multiple'"
          :collapse-tags="selectModes[item.prop] === 'multiple'"
          :max-collapse-tags="item.maxTagCount || 1"
          :disabled="!!item.disabled"
          :filter-method="getSelectFilterMethod(item)"
          style="width: 100%"
          @change="(val: any) => onFieldChange(item, val)"
        >
          <el-option
            v-for="op in item.options || []"
            :key="String(getOptionValue(item, op))"
            :label="String(getOptionLabel(item, op) ?? '')"
            :value="getOptionValue(item, op)"
            :disabled="!!op.disabled"
          />
        </el-select>

        <el-date-picker
          v-else-if="item.type === 'date'"
          v-model="baseForm[item.prop]"
          type="datetime"
          :placeholder="formatterPlaceholder(item)"
          :format="formatParamsTrim(item.dateFormat) || 'YYYY-MM-DD'"
          :value-format="formatParamsTrim(item.valueFormat) || 'YYYY-MM-DD'"
          :disabled="!!item.disabled"
          :disabled-date="item.disabledDate"
          style="width: 100%"
        />

        <el-autocomplete
          v-else-if="item.type === 'autoComplete'"
          v-model="baseForm[item.prop]"
          :placeholder="formatterPlaceholder(item)"
          :disabled="!!item.disabled"
          :clearable="item.allowClear !== false && item.clearable !== false"
          :fetch-suggestions="(query: string, cb: any) => queryAutoComplete(item, query, cb)"
          @select="(op: any) => onSelect(item, op?.value)"
        />

        <el-switch
          v-else-if="item.type === 'switch'"
          v-model="baseForm[item.prop]"
          :active-text="item.checkedChildren || ''"
          :inactive-text="item.unCheckedChildren || ''"
          :loading="!!item.loading"
          :disabled="!!item.disabled"
          :size="item.size || 'default'"
          @change="(val: any) => onFieldChange(item, val)"
        />

        <el-input
          v-else-if="item.type === 'textarea'"
          v-model="baseForm[item.prop]"
          type="textarea"
          :placeholder="formatterPlaceholder(item)"
          :autosize="item.autoSize || false"
          :clearable="item.allowClear !== false && item.clearable !== false"
          :maxlength="item.maxLength || 100"
          :disabled="!!item.disabled"
          show-word-limit
        />

        <el-input-number
          v-else-if="item.type === 'inputNumber'"
          v-model="baseForm[item.prop]"
          :placeholder="formatterPlaceholder(item)"
          :min="item.min ?? 0"
          :max="item.max ?? 999999"
          :step="item.step ?? 1"
          :precision="item.precision ?? 0"
          :disabled="!!item.disabled"
          :formatter="(val: any) => (item.unit ? `${val ?? ''}${item.unit}` : `${val ?? ''}`)"
          :parser="(val: string) => (item.unit ? val.replace(item.unit, '') : val)"
          style="width: 100%"
          @change="(val: any) => onFieldChange(item, val)"
        />

        <el-input
          v-else-if="item.type === 'password'"
          v-model="baseForm[item.prop]"
          type="password"
          show-password
          :placeholder="formatterPlaceholder(item)"
          :maxlength="item.maxLength || 20"
          :clearable="item.allowClear !== false && item.clearable !== false"
          :disabled="!!item.disabled"
          :autocomplete="item.autocomplete"
        />

        <div v-else class="input-with-counter">
          <el-input
            v-model="baseForm[item.prop]"
            :placeholder="formatterPlaceholder(item)"
            :maxlength="item.maxLength || 20"
            :clearable="item.allowClear !== false && item.clearable !== false"
            :disabled="!!item.disabled"
            @keyup.enter="item.pressEnter?.()"
            @change="(val: any) => onFieldChange(item, val)"
          />
          <span v-if="item.showCharCounter" class="char-counter">
            {{ String(baseForm[item.prop] || '').length }}{{ item.maxLength ? `/${item.maxLength}` : '' }}
          </span>
        </div>
      </el-form-item>
    </template>
  </el-form>
</template>

<style scoped>
.submit-form-custom-all {
  display: contents;
}

.label-box {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tip-icon {
  cursor: pointer;
  color: #f56c6c;
}

.input-with-counter {
  position: relative;
  width: 100%;
  flex: 1;
}

.char-counter {
  position: absolute;
  right: 0;
  bottom: -22px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
