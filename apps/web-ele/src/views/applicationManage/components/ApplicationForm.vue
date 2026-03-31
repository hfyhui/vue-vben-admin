<script lang="ts" setup>
import { reactive, ref, watch } from 'vue';

import { type ApplicationUpsertPayload } from '#/api/core/application';
import ImageUpload from '#/components/ImageUpload.vue';
import ScriptSelector from './ScriptSelector.vue';

const props = defineProps<{
  modelValue?: Record<string, any> | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: ApplicationUpsertPayload): void;
  (e: 'update:visible', value: boolean): void;
}>();

const submitFormRef = ref();
const submitData = reactive<Record<string, any>>({
  activityName: '',
  applicationName: '',
  logoPath: '',
  orderNum: undefined,
  packageName: '',
  programType: [],
  programTypeDetail: [],
});
const rules = {
  applicationName: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  logoPath: [{ required: true, message: '请上传Logo', trigger: 'change' }],
  programType: [{ required: true, message: '请选择脚本清单', trigger: 'change' }],
};

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return;
    const row = props.modelValue;
    if (!row) {
      resetForm();
      return;
    }
    submitData.id = row.id;
    submitData.applicationName = row.applicationName;
    submitData.logoPath = row.logoPath;
    submitData.packageName = row.packageName;
    submitData.activityName = row.activityName;
    submitData.orderNum = row.orderNum;
    submitData.programType = row.programIds || [];
    submitData.programTypeDetail = row.programType || [];
    submitData.applicationStatus = row.applicationStatus;
  },
  { immediate: true },
);

async function submitFn() {
  const valid = await submitFormRef.value?.validate?.().then(() => true).catch(() => false);
  if (!valid) return;
  const normalizedProgramType = submitData.programTypeDetail.map((item: Record<string, any>) => ({
    ...item,
    id: item.id,
    programIds: item.programIds,
    scriptId: item.scriptId,
    form: item.form,
    extendedColumn: item.extendedColumn,
  }));
  const detailIds = normalizedProgramType.map(
    (item: Record<string, any>) => item.programIds,
  );
  const payload: ApplicationUpsertPayload = {
    id: submitData.id,
    applicationName: submitData.applicationName,
    logoPath: submitData.logoPath,
    packageName: submitData.packageName,
    activityName: submitData.activityName,
    orderNum: submitData.orderNum,
    programIds: detailIds.length ? detailIds : submitData.programType,
    programType: normalizedProgramType,
    applicationStatus: submitData.applicationStatus,
  };
  emit('submit', payload);
}

function onScriptChange() {
  submitFormRef.value?.validateField?.('programType');
}

function onScriptDetailChange(list: Record<string, any>[]) {
  submitData.programTypeDetail = list;
}

function resetForm() {
  submitData.id = undefined;
  submitData.applicationName = '';
  submitData.logoPath = '';
  submitData.packageName = '';
  submitData.activityName = '';
  submitData.orderNum = undefined;
  submitData.programType = [];
  submitData.programTypeDetail = [];
  submitData.applicationStatus = undefined;
  submitFormRef.value?.resetFields?.();
}

defineExpose({
  reset: resetForm,
  resetSubmitting: () => {},
  submitFn,
});
</script>

<template>
  <div>
    <el-form ref="submitFormRef" :model="submitData" :rules="rules" label-width="120px">
    <el-form-item label="应用名称" prop="applicationName">
      <el-input v-model="submitData.applicationName" maxlength="20" show-word-limit />
    </el-form-item>

    <el-form-item prop="logoPath">
      <template #label>
        <span class="logo-label">
          <span>上传logo</span>
          <el-tooltip content="建议logo尺寸为 16px * 16px" placement="top">
            <span class="logo-tip-icon">?</span>
          </el-tooltip>
        </span>
      </template>
      <ImageUpload
        v-model="submitData.logoPath"
        file-format=".jpg,.jpeg,.png,.bmp,.gif"
        :file-size="5120"
        @change="
          () => {
            submitFormRef?.validateField?.('logoPath');
          }
        "
      />
    </el-form-item>

    <el-form-item label="包名" prop="packageName">
      <el-input v-model="submitData.packageName" maxlength="1000" />
    </el-form-item>

    <el-form-item label="Activity名称" prop="activityName">
      <el-input v-model="submitData.activityName" maxlength="1000" />
    </el-form-item>

      <el-form-item label="脚本清单" prop="programType">
        <ScriptSelector
          v-model="submitData.programType"
          :detail-list="submitData.programTypeDetail"
          @change="onScriptChange"
          @change-detail="onScriptDetailChange"
        />
      </el-form-item>

      <el-form-item label="序号" prop="orderNum">
        <el-input-number
          v-model="submitData.orderNum"
          :min="0"
          :max="999999"
          :step="1"
          :precision="0"
          controls
          style="width: 100%"
        />
      </el-form-item>
    </el-form>

  </div>
</template>

<style scoped>
.logo-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.logo-tip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px solid #f56c6c;
  border-radius: 50%;
  color: #f56c6c;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}
</style>
