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
  appArea: '',
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

// 需同时依赖 modelValue：仅监听 visible 时，若弹窗未关闭就从编辑切到新增（visible 一直为 true），不会触发重置，仍显示上一条数据
watch(
  () => [props.visible, props.modelValue] as const,
  ([visible, row]) => {
    if (!visible) return;
    if (!row) {
      resetForm();
      return;
    }
    submitData.id = row.id;
    submitData.applicationName = row.applicationName;
    submitData.logoPath = row.logoPath;
    submitData.packageName = row.packageName;
    submitData.activityName = row.activityName;
    submitData.appArea = row.appArea;
    submitData.orderNum = row.orderNum;
    // 与 social_media_web CEModal 提交逻辑一致：programIds = programType.map(el => el.programIds || el.id)
    const pt = Array.isArray(row.programType) ? row.programType : [];
    submitData.programTypeDetail = pt;
    if (Array.isArray(row.programIds) && row.programIds.length) {
      submitData.programType = row.programIds.map((id: unknown) => String(id)).filter(Boolean);
    } else {
      submitData.programType = pt
        .map((el: Record<string, any>) => {
          const id = el.programIds ?? el.id;
          return id != null && id !== '' ? String(id) : '';
        })
        .filter(Boolean);
    }
    submitData.applicationStatus = row.applicationStatus;
  },
  { immediate: true },
);

async function submitFn() {
  const valid = await submitFormRef.value?.validate?.().then(() => true).catch(() => false);
  if (!valid) return;
  // 与 CEModal 一致：programIds = programType.map(el => el.programIds || el.id)
  const detailIds = submitData.programTypeDetail
    .map((item: Record<string, any>) => {
      const raw = item.programIds ?? item.id;
      return raw != null && raw !== '' ? String(raw) : '';
    })
    .filter(Boolean);
  const programIds = detailIds.length ? detailIds : submitData.programType;
  // 与接口详情返回结构对齐：子项不要带冗余 programIds；补 systemConfig（系统脚本为 1，自建为 0）
  const normalizedProgramType = submitData.programTypeDetail.map((item: Record<string, any>) => {
    const row: Record<string, any> = {
      id: item.id,
      logoPath: item.logoPath,
      programName: item.programName,
      scriptId: item.scriptId ?? null,
      form: item.form ?? null,
      extendedColumn: item.extendedColumn ?? null,
      systemConfig: item.systemConfig ?? 0,
    };
    if (item.programCategory != null && item.programCategory !== '') {
      row.programCategory = item.programCategory;
    }
    return row;
  });
  // 与 social_media_web CEModal：applicationStatus 空则默认 1（禁用态）
  const applicationStatus =
    submitData.applicationStatus === undefined ||
    submitData.applicationStatus === null ||
    submitData.applicationStatus === ''
      ? 1
      : submitData.applicationStatus;
  const payload: ApplicationUpsertPayload = {
    id: submitData.id,
    applicationName: submitData.applicationName,
    logoPath: submitData.logoPath,
    packageName: submitData.packageName,
    activityName: submitData.activityName,
    appArea: submitData.appArea,
    orderNum: submitData.orderNum,
    programIds,
    // 与 CEModal 一致：无明细时不要传空 programType，避免后端按「清空脚本」处理
    ...(normalizedProgramType.length ? { programType: normalizedProgramType } : {}),
    applicationStatus,
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
  submitData.appArea = '';
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

      <el-form-item :label="$t('applicationManage.form.appArea')" prop="appArea">
        <el-select
          v-model="submitData.appArea"
          :placeholder="$t('applicationManage.form.appAreaPlaceholder')"
          style="width: 100%"
          clearable
        >
          <el-option :label="$t('applicationManage.form.appAreaDomestic')" value="国内" />
          <el-option :label="$t('applicationManage.form.appAreaOverseas')" value="国外" />
        </el-select>
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
