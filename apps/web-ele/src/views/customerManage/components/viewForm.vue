<script setup lang="ts">
import { $t } from '#/locales';

interface CustomerInfo {
  id: string;
  customersName: string;
  customersType: 'COMPANY' | 'ORGANIZATION' | 'PERSONAL';
  unifiedSocialCreditCode?: string;
  legalPerson?: string;
  legalPersonIdType?: string;
  legalPersonIdNumber?: string;
  individualBusinessLicenseCode?: string;
  personalIdType?: string;
  personalIdNumber?: string;
  shareholderInfos?: Array<{
    shareholderIdNumber: string;
    shareholderIdType: string;
    shareholderName: string;
  }>;
}

interface Props {
  visible?: boolean;
  modelValue?: CustomerInfo;
  customerTypes?: any[];
  idTypeOptions?: any[];
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 获取客户类型名称
function getCustomerTypeName(type: string): string {
  const customerType = props.customerTypes?.find((item) => item.name === type);
  return customerType?.content || type;
}

// 获取证件类型名称
function getIdTypeName(type: string): string {
  const idType = props.idTypeOptions?.find((item) => item.name === type);
  return idType?.content || type;
}

function handleClose() {
  emit('update:visible', false);
}
</script>

<template>
  <ElDialog
    :model-value="props.visible"
    :title="$t('customerManage.title')"
    width="940px"
    @close="handleClose"
  >
    <div v-if="props.modelValue" class="customer-detail">
      <ElDescriptions :column="1" border>
        <!-- 基本信息 -->
        <ElDescriptionsItem :label="$t('customerManage.form.name')">
          <span class="font-medium">{{
            props.modelValue.customersName || '-'
          }}</span>
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="$t('customerManage.form.type')">
          <ElTag type="primary">
            {{ getCustomerTypeName(props.modelValue.customersType) }}
          </ElTag>
        </ElDescriptionsItem>

        <!-- 公司信息 -->
        <template v-if="props.modelValue.customersType === 'COMPANY'">
          <ElDescriptionsItem :label="$t('customerManage.form.creditCode')">
            <span class="font-medium">{{
              props.modelValue.unifiedSocialCreditCode || '-'
            }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('customerManage.form.legalName')">
            <span class="font-medium">{{
              props.modelValue.legalPerson || '-'
            }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('customerManage.form.legalIdType')">
            <span class="font-medium">{{
              getIdTypeName(props.modelValue.legalPersonIdType) || '-'
            }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('customerManage.form.legalIdNo')">
            <span class="font-medium">{{
              props.modelValue.legalPersonIdNumber || '-'
            }}</span>
          </ElDescriptionsItem>
        </template>

        <!-- 组织信息 -->
        <template v-if="props.modelValue.customersType === 'ORGANIZATION'">
          <ElDescriptionsItem :label="$t('customerManage.form.individualBusinessLicenseCode')">
            <span class="font-medium">{{
              props.modelValue.individualBusinessLicenseCode || '-'
            }}</span>
          </ElDescriptionsItem>
        </template>

        <!-- 个人信息 -->
        <template v-if="props.modelValue.customersType === 'PERSONAL'">
          <ElDescriptionsItem :label="$t('customerManage.form.personIdType')">
            <span class="font-medium">{{
              getIdTypeName(props.modelValue.personalIdType) || '-'
            }}</span>
          </ElDescriptionsItem>
          <ElDescriptionsItem :label="$t('customerManage.form.personIdNo')">
            <span class="font-medium">{{
              props.modelValue.personalIdNumber || '-'
            }}</span>
          </ElDescriptionsItem>
        </template>
      </ElDescriptions>

      <!-- 股东信息 -->
      <div
        v-if="
          props.modelValue.customersType === 'COMPANY' &&
          props.modelValue.shareholderInfos?.length > 0
        "
        class="shareholders-section"
      >
        <h3 class="section-title">
          {{ $t('customerManage.form.shareholders') }}
        </h3>
        <ElTable
          :data="props.modelValue.shareholderInfos"
          style="width: 100%"
          border
        >
          <ElTableColumn
            :label="$t('customerManage.shareholder.name')"
            prop="shareholderName"
            width="200"
          />
          <ElTableColumn
            :label="$t('customerManage.shareholder.idType')"
            width="200"
          >
            <template #default="{ row }">
              {{ getIdTypeName(row.shareholderIdType) }}
            </template>
          </ElTableColumn>
          <ElTableColumn
            :label="$t('customerManage.shareholder.idNo')"
            prop="shareholderIdNumber"
          />
        </ElTable>
      </div>
    </div>

    <template #footer>
      <div class="detail-actions">
        <ElButton @click="handleClose">
          {{ $t('customerManage.form.cancel') }}
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.customer-detail {
  padding: 20px 0;
}

.shareholders-section {
  margin-top: 24px;
}

.section-title {
  padding-bottom: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #e5e7eb !important;
}

.detail-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.font-medium {
  font-weight: 500;
}

:deep(.el-descriptions__label) {
  width: 180px;
  font-weight: 500;
  color: #333;
  background-color: transparent !important;
}

:deep(.el-descriptions__content) {
  color: #333;
}

:deep(.vxe-table--empty-content) {
  padding: 40px 0 !important;
}
</style>
