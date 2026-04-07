<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  getAssetAiboxDeviceModelsApi,
  getAssetCloudDeviceModelsApi,
  getAssetDeviceDetailApi,
  getAssetOperatorListApi,
  type AssetOperatorItem,
  type MobileDeviceBrandItem,
  type MobileDeviceCategoryItem,
  newDeviceApi,
  updateAssetOperatorApi,
} from '#/api/core/asset';
import { $t } from '#/locales';

type ListRow = {
  deviceId?: string;
  chip?: string;
  server?: string;
  armId?: string;
};

const emit = defineEmits<{
  (e: 'success-after'): void;
}>();

function catVal(c: MobileDeviceCategoryItem) {
  return c.model ?? c.category ?? '';
}

function catLabel(c: MobileDeviceCategoryItem) {
  return c.deiceName ?? c.title ?? c.deviceName ?? c.model ?? c.category ?? '';
}

function operatorOptionLabel(item: AssetOperatorItem) {
  return (
    item.allName ??
    item.operatorZhName ??
    item.operatorEnName ??
    item.id ??
    ''
  );
}

/** 详情里 netOperator 可能是 id 或历史文本，统一为下拉可选的 id */
function normalizeNetOperatorToId() {
  const v = form.netOperator;
  if (!v || !operatorList.value.length) return;
  if (operatorList.value.some((o) => o.id === v)) return;
  const match = operatorList.value.find(
    (o) =>
      o.allName === v ||
      o.operatorZhName === v ||
      o.operatorEnName === v,
  );
  if (match?.id) form.netOperator = match.id;
}

const listRow = ref<ListRow | null>(null);
const loading = ref(false);
const submitting = ref(false);
const saving = ref(false);
const chipCode = ref('');
const productMode = ref<'basic' | 'cloud' | 'aibox'>('cloud');
// 对齐旧项目命名：productType = 芯片类型（AIBOX_L02 / C_ARM_392000 / ...）
const productType = computed(() =>
  chipCode.value
);
const brandList = ref<MobileDeviceBrandItem[]>([]);
const modelList = ref<MobileDeviceCategoryItem[]>([]);
const operatorList = ref<AssetOperatorItem[]>([]);

const form = reactive({
  deviceIp: '',
  brand: '',
  category: '',
  phoneNumber: '',
  serialNumber: '',
  imei: '',
  imsi: '',
  sn: '',
  iccid: '',
  netOperator: '',
  nodeId: '',
  armId: '',
});

function resetState() {
  listRow.value = null;
  chipCode.value = '';
  productMode.value = 'cloud';
  brandList.value = [];
  modelList.value = [];
  operatorList.value = [];
  Object.assign(form, {
    deviceIp: '',
    brand: '',
    category: '',
    phoneNumber: '',
    serialNumber: '',
    imei: '',
    imsi: '',
    sn: '',
    iccid: '',
    netOperator: '',
    nodeId: '',
    armId: '',
  });
}

/** 详情里只取与表单对应的固定字段 */
function applyDetail(d: Record<string, any>) {
  form.deviceIp = d.deviceIp ?? '';
  form.brand = d.brand ?? '';
  form.category = d.category ?? '';
  form.phoneNumber = d.phoneNumber ?? '';
  form.serialNumber = d.serialNumber ?? '';
  form.imei = d.imei ?? '';
  form.imsi = d.imsi ?? '';
  form.sn = d.sn ?? '';
  form.iccid = d.iccid ?? '';
  form.netOperator = d.netOperator ?? '';
  form.nodeId = d.nodeId ?? '';
  form.armId = d.armId ?? listRow.value?.armId ?? listRow.value?.server ?? '';
}

function updateModelList() {
  const item = brandList.value.find((b) => b.brand === form.brand);
  modelList.value = item?.categories ?? [];
  if (!modelList.value.length) return;
  if (!modelList.value.some((c) => catVal(c) === form.category)) {
    form.category = catVal(modelList.value[0]!);
  }
}

function onBrandChange() {
  if (productMode.value === 'basic') return;
  form.category = '';
  updateModelList();
}

async function loadBrandModels(chip: string) {
  const normalizedChip = String(chip ?? '').trim();
  // 兼容列表里显示为 ARM_3588 的情况
  const is3588 =
    normalizedChip === 'C_ARM_392000' ||
    normalizedChip === 'ARM_3588' ||
    normalizedChip.includes('3588');

  if (is3588) {
    productMode.value = 'basic';
    brandList.value = [];
    modelList.value = [];
    return;
  }
  productMode.value = normalizedChip === 'AIBOX_L02' ? 'aibox' : 'cloud';
  const res =
    normalizedChip === 'AIBOX_L02'
      ? await getAssetAiboxDeviceModelsApi()
      : await getAssetCloudDeviceModelsApi();
  if (res?.code !== 100000) {
    // ElMessage.error(res?.msg || $t('containerPool.quickNew.loadProductFailed'));
    brandList.value = [];
    modelList.value = [];
    return;
  }
  brandList.value = (res.data?.mobileDeviceModels ?? []).filter((b) => b.brand);
}

async function loadDeviceData(row: ListRow) {
  loading.value = true;
  try {
    if (!row.deviceId) {
      ElMessage.warning($t('containerPool.message.missingDeviceId'));
      return;
    }
    const [detailRes, operatorRes] = await Promise.all([
      getAssetDeviceDetailApi(row.deviceId),
      getAssetOperatorListApi(),
    ]);
    if (operatorRes?.code === 100000 && Array.isArray(operatorRes.data)) {
      operatorList.value = operatorRes.data.filter((o) => o.id);
    } else {
      operatorList.value = [];
    }
    if (detailRes?.code === 100000) {
      const detail = detailRes.data ?? {};
      const chip = row.chip ?? detail.chipCode ?? '';
      chipCode.value = chip;

      await loadBrandModels(chip);
      applyDetail(detail);
      // 只有百度盒子运营商是下拉（值为 id），才需要把历史文本归一为 id
      if (productType.value === 'AIBOX_L02') {
        normalizeNetOperatorToId();
      }
      if (productMode.value !== 'basic') {
        updateModelList();
      }
    }
  } catch (error) {
    console.error('[containerPool] 一键新机加载失败:', error);
    // ElMessage.error($t('containerPool.quickNew.loadDetailFailed'));
  } finally {
    loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  title: $t('containerPool.quickNew.title'),
  class: 'w-[560px]',
  closeOnClickModal: false,
  showConfirmButton: false,
  showCancelButton: false,
  onCancel() {
    modalApi.close();
  },
  onOpenChange: async (isOpen: boolean) => {
    if (isOpen) {
      const data = modalApi.getData<{ row?: ListRow }>();
      resetState();
      const row = data?.row;
      if (row?.deviceId) {
        listRow.value = row;
        await loadDeviceData(row);
      }
    } else {
      resetState();
    }
  },
});

async function onQuickNew() {
  if (!listRow.value?.deviceId || submitting.value) return;
  try {
    await ElMessageBox.confirm(
      $t('containerPool.quickNew.confirmMessage'),
      $t('containerPool.quickNew.confirmTitle'),
      {
        type: 'warning',
        confirmButtonText: $t('containerPool.message.confirmButtonText'),
        cancelButtonText: $t('containerPool.message.cancelButtonText'),
      },
    );
  } catch {
    return;
  }

  submitting.value = true;
  modalApi.lock();
  try {
    const res = await newDeviceApi({
      deviceId: listRow.value.deviceId,
      armId: form.armId,
      nodeId: form.nodeId,
      brand: form.brand,
      category: form.category,
      phoneNumber: form.phoneNumber,
      imei: form.imei,
      serialNumber: form.serialNumber,
      netOperator: form.netOperator,
      imsi: form.imsi,
      sn: form.sn,
      iccid: form.iccid,
      chipCode: chipCode.value,
    });
    if (res?.code === 100000) {
      ElMessage.success(res.msg || $t('containerPool.quickNew.success'));
      modalApi.close();
      emit('success-after');
    } else {
      // ElMessage.error(res?.msg || $t('containerPool.quickNew.failed'));
    }
  } catch (error) {
    console.error('[containerPool] 一键新机提交失败:', error);
    // ElMessage.error($t('containerPool.quickNew.failed'));
  } finally {
    submitting.value = false;
    modalApi.unlock();
  }
}

async function onSave() {
  if (saving.value || loading.value) return;

  const operatorId = form.netOperator?.trim();
  const params = operatorId ? { operatorId } : {};

  saving.value = true;
  modalApi.lock();
  try {
    const res = await updateAssetOperatorApi(params);
    if (res?.code === 100000) {
      ElMessage.success(res.msg || '保存成功');
      modalApi.close();
      emit('success-after');
    }
  } catch (error) {
    console.error('[containerPool] 保存运营商失败:', error);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
    modalApi.unlock();
  }
}
</script>

<template>
  <Modal :footer="false">
    <div v-loading="loading" class="quick-new-device-body">
      <el-form label-width="100px" class="quick-new-form">
        <el-form-item :label="$t('containerPool.quickNew.deviceIp')">
          <el-input v-model="form.deviceIp" disabled />
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.brand')">
          <el-input
            v-if="productMode === 'basic'"
            v-model="form.brand"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
          <el-select
            v-else
            v-model="form.brand"
            filterable
            clearable
            :placeholder="$t('containerPool.quickNew.pleaseSelect')"
            style="width: 100%"
            @change="onBrandChange"
          >
            <el-option
              v-for="(item, index) in brandList"
              :key="index"
              :label="item.title || item.brand || ''"
              :value="item.brand"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.model')">
          <el-input
            v-if="productMode === 'basic'"
            v-model="form.category"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
          <el-select
            v-else
            v-model="form.category"
            filterable
            clearable
            :placeholder="$t('containerPool.quickNew.pleaseSelect')"
            style="width: 100%"
          >
            <el-option
              v-for="(item, index) in modelList"
              :key="index"
              :label="catLabel(item)"
              :value="catVal(item)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.netOperator')">
          <el-select
            v-if="productType === 'AIBOX_L02'"
            v-model="form.netOperator"
            filterable
            clearable
            :placeholder="$t('containerPool.quickNew.pleaseSelect')"
            style="width: 100%"
          >
            <el-option
              v-for="(item, index) in operatorList"
              :key="index"
              :label="operatorOptionLabel(item)"
              :value="item.id ?? ''"
            />
          </el-select>
          <el-input
            v-else
            v-model="form.netOperator"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.phoneNumber')">
          <el-input
            v-model="form.phoneNumber"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.serialNumber')">
          <el-input
            v-model="form.serialNumber"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.imei')">
          <el-input
            v-model="form.imei"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.imsi')">
          <el-input
            v-model="form.imsi"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.sn')">
          <el-input
            v-model="form.sn"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
        </el-form-item>
        <el-form-item :label="$t('containerPool.quickNew.iccid')">
          <el-input
            v-model="form.iccid"
            :placeholder="$t('containerPool.quickNew.pleaseInput')"
            clearable
          />
        </el-form-item>
      </el-form>
      <div class="quick-new-footer">
        <el-button
          v-if="productType === 'AIBOX_L02' || productType === 'C_ARM_392000'"
          type="primary"
          plain
          :loading="submitting"
          :disabled="loading"
          @click="onQuickNew"
        >
          {{ $t('containerPool.action.quickNewDevice') }}
        </el-button>
        <el-button @click="modalApi.close()">
          {{ $t('containerPool.message.cancelButtonText') }}
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="loading"
          @click="onSave"
        >
          {{ $t('common.save') }}
        </el-button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.quick-new-device-body {
  min-height: 200px;
}

.quick-new-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.quick-new-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 8px;
}
</style>
