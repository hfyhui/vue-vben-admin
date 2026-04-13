<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';

import {
  getApplicationScriptListApi,
  saveDynamicFormApi,
  type ApplicationScriptItem,
} from '#/api/core/application';
import ImageUpload from '#/components/ImageUpload.vue';
import SubmitForm from '#/components/SubmitForm/index.vue';
import { $t } from '#/locales';
import { useAssetEnumsStore } from '#/store';
import { formatAssetImageUrl } from '#/utils/asset-url';
import CurrentForm from './currentForm/index.vue';

type ScriptCard = {
  id: string;
  scriptId: string;
  dynamicFormId?: string;
  programIds?: string;
  programName: string;
  logoPath?: string;
  programCategory?: string;
  currentForm?: any[];
  extendedColumn?: any[];
};

const props = defineProps<{
  modelValue?: string[];
  detailList?: Record<string, any>[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
  (e: 'change', value: string[]): void;
  (e: 'changeDetail', value: Record<string, any>[]): void;
}>();

const scriptLoading = ref(false);
const scriptDrawerVisible = ref(false);
const drawerSubmitFormRef = ref();
const scriptOptionsRaw = ref<ApplicationScriptItem[]>([]);
const localScriptMap = ref<Record<string, ScriptCard>>({});
const currentEditId = ref<string>('');
const assetEnumsStore = useAssetEnumsStore();

const drawerForm = reactive<ScriptCard>({
  id: '',
  scriptId: '',
  programName: '',
  logoPath: '',
  programCategory: '',
  currentForm: [],
  extendedColumn: [],
});

const modelIds = computed<string[]>(() => {
  return props.modelValue || [];
});

const detailMap = computed<Record<string, Record<string, any>>>(
  () =>
    (props.detailList || []).reduce((acc, item: Record<string, any>) => {
      const key = item.programIds ?? item.id;
      if (key != null && key !== '') {
        acc[String(key)] = item;
      }
      return acc;
    }, {} as Record<string, Record<string, any>>),
);

const scriptSelectOptions = computed(() =>
  scriptOptionsRaw.value.map((item: any) => ({
    value: item.id,
    label: item.name,
    logoPath: item.logoPath,
    programCategory: item.programCategory,
  })),
);

const scriptCategoryOptions = computed(() => {
  const mobileTaskCategory = assetEnumsStore.getEnumByKey<any>('MOBILE_TASK_CATEGORY');
  const categoryList = Array.isArray(mobileTaskCategory?.children)
    ? mobileTaskCategory.children
    : [];
  return categoryList.map((item: any) => ({
    label: item.content,
    value: item.name,
  }));
});

const selectedScriptList = computed<ScriptCard[]>(() =>
  modelIds.value.map((id) => {
    const local = localScriptMap.value[id];
    const fromDetail = detailMap.value[id];
    const sourceScriptId = local?.scriptId || fromDetail?.scriptId || id;
    const fromApi = scriptOptionsRaw.value.find((op: any) => op.id === sourceScriptId);
    const apiMeta = buildApiScriptMeta(fromApi);
    const source: Record<string, any> = (local || fromDetail || apiMeta) as Record<string, any>;
    const dynamicFormId = local?.dynamicFormId || source.programIds || source.id || id;
    return {
      id,
      scriptId: sourceScriptId,
      dynamicFormId,
      programIds: source.programIds || source.id || dynamicFormId,
      programName: source.programName,
      logoPath: source.logoPath,
      programCategory: source.programCategory,
      currentForm: source.currentForm || source.form,
      extendedColumn: source.extendedColumn,
    };
  }),
);

const drawerTitle = computed(() =>
  currentEditId.value
    ? $t('applicationManage.scriptSelector.drawerTitleEdit')
    : $t('applicationManage.scriptSelector.drawerTitleAdd'),
);

const drawerColumns = computed<any[]>(() => [
  {
    type: 'input' as const,
    label: $t('applicationManage.scriptSelector.field.programName'),
    prop: 'programName',
    maxLength: 20,
    placeholder: $t('applicationManage.scriptSelector.placeholder.programName'),
    rules: [{ required: true, message: $t('applicationManage.scriptSelector.rule.programName') }],
  },
  {
    type: 'customInput' as const,
    label: $t('applicationManage.scriptSelector.field.logoPath'),
    prop: 'logoPath',
    slot: 'logoPath',
    rules: [{ required: true, message: $t('applicationManage.scriptSelector.rule.logoPath') }],
  },
  {
    type: 'select' as const,
    label: $t('applicationManage.scriptSelector.field.programCategory'),
    prop: 'programCategory',
    options: scriptCategoryOptions.value,
    placeholder: $t('applicationManage.scriptSelector.placeholder.programCategory'),
  },
  {
    type: 'select' as const,
    label: $t('applicationManage.scriptSelector.field.scriptId'),
    prop: 'scriptId',
    options: scriptSelectOptions.value,
    placeholder: $t('applicationManage.scriptSelector.placeholder.scriptId'),
    rules: [{ required: true, message: $t('applicationManage.scriptSelector.rule.scriptId') }],
    change: onScriptIdChange,
  },
  {
    type: 'customInput' as const,
    label: $t('applicationManage.scriptSelector.field.form'),
    prop: 'currentForm',
    slot: 'currentForm',
  },
]);

const drawerRules = computed(() => ({
  programName: [
    { required: true, message: $t('applicationManage.scriptSelector.rule.programName'), trigger: 'blur' },
  ],
  logoPath: [
    { required: true, message: $t('applicationManage.scriptSelector.rule.logoPath'), trigger: 'change' },
  ],
  scriptId: [
    { required: true, message: $t('applicationManage.scriptSelector.rule.scriptId'), trigger: 'change' },
  ],
}));

function buildApiScriptMeta(item?: any) {
  return {
    programName: item?.name,
    logoPath: item?.logoPath,
    programCategory: item?.programCategory,
    currentForm: item?.form || item?.currentForm,
    extendedColumn: item?.extendedColumn,
  };
}

function buildProgramTypeList(ids: string[]) {
  return ids.map((id) => {
    const local = localScriptMap.value[id];
    const fromDetail = detailMap.value[id];
    const sourceScriptId = local?.scriptId;
    const fallbackScriptId = sourceScriptId || fromDetail?.scriptId || id;
    const fromApi = scriptOptionsRaw.value.find((op: any) => op.id === fallbackScriptId);
    const apiMeta = buildApiScriptMeta(fromApi);
    const source: Record<string, any> = (local || fromDetail || apiMeta) as Record<string, any>;
    const payloadProgramId =
      local?.programIds || local?.dynamicFormId || fromDetail?.programIds || id;
    const payloadId = local?.id || fromDetail?.id || payloadProgramId;
    return {
      id: payloadId,
      programIds: payloadProgramId,
      scriptId: local?.scriptId || fromDetail?.scriptId || fallbackScriptId,
      programName: source.programName,
      logoPath: source.logoPath,
      programCategory: source.programCategory,
      form: source.currentForm || source.form,
      extendedColumn: source.extendedColumn,
    };
  });
}

onMounted(() => {
  void assetEnumsStore.ensureAssetEnumsLoaded();
  fetchScriptOptions();
});

async function fetchScriptOptions() {
  if (scriptLoading.value) return;
  scriptLoading.value = true;
  try {
    const res = await getApplicationScriptListApi();
    const data = (res as any)?.data;
    scriptOptionsRaw.value = data || [];
  } catch {
    scriptOptionsRaw.value = [];
    ElMessage.warning($t('applicationManage.scriptSelector.message.scriptListLoadFailed'));
  } finally {
    scriptLoading.value = false;
  }
}

function resetDrawerForm() {
  drawerForm.id = '';
  drawerForm.scriptId = '';
  drawerForm.dynamicFormId = '';
  drawerForm.programName = '';
  drawerForm.logoPath = '';
  drawerForm.programCategory = '';
  drawerForm.currentForm = [];
  drawerForm.extendedColumn = [];
}

async function addTaskType(row?: ScriptCard) {
  await fetchScriptOptions();
  resetDrawerForm();
  currentEditId.value = '';
  if (row?.id) {
    currentEditId.value = row.id;
    drawerForm.id = row.id;
    drawerForm.scriptId = row.scriptId;
    drawerForm.dynamicFormId = row.dynamicFormId;
    drawerForm.programName = row.programName;
    drawerForm.logoPath = row.logoPath;
    drawerForm.programCategory = row.programCategory;
    drawerForm.currentForm = row.currentForm || [];
    drawerForm.extendedColumn =  row.extendedColumn || [];
  }
  scriptDrawerVisible.value = true;
}

function cancelFn() {
  scriptDrawerVisible.value = false;
  drawerSubmitFormRef.value?.clearValidate?.();
  resetDrawerForm();
  currentEditId.value = '';
}

function onScriptIdChange(value: string) {
  const current = scriptOptionsRaw.value.find((item: any) => item.id === value);
  if (!current) return;
  const apiMeta = buildApiScriptMeta(current);
  if (!drawerForm.logoPath) {
    drawerForm.logoPath = apiMeta.logoPath;
  }
  if (!drawerForm.programCategory) {
    drawerForm.programCategory = apiMeta.programCategory;
  }
  // 仅在当前无自定义字段时回填默认配置，避免覆盖用户刚新增/编辑的表单项
  const hasCustomForm = Array.isArray(drawerForm.currentForm) && drawerForm.currentForm.length > 0;
  const hasCustomExt = Array.isArray(drawerForm.extendedColumn) && drawerForm.extendedColumn.length > 0;
  if (!hasCustomForm && !hasCustomExt) {
    drawerForm.currentForm = apiMeta.currentForm || [];
    drawerForm.extendedColumn = apiMeta.extendedColumn || [];
  }
}

async function submitFn() {
  const valid = await drawerSubmitFormRef.value?.validateFn?.();
  if (!valid) {
    return;
  }
  const selectedScriptId = drawerForm.scriptId;
  if (!selectedScriptId) return;

  const dynamicPayload = {
    id: drawerForm.dynamicFormId,
    scriptId: selectedScriptId,
    programName: drawerForm.programName,
    logoPath: drawerForm.logoPath,
    programCategory: drawerForm.programCategory,
    form: drawerForm.currentForm || [],
    extendedColumn: drawerForm.extendedColumn || [],
  };
  const saveRes = await saveDynamicFormApi(dynamicPayload);
  const saveData = (saveRes as any)?.data;
  const dynamicFormId = saveData?.id || saveData || drawerForm.dynamicFormId;
  if (!dynamicFormId) {
    ElMessage.error($t('applicationManage.scriptSelector.message.dynamicFormSaveFailed'));
    return;
  }

  const newCard: ScriptCard = {
    id: dynamicFormId,
    programIds: dynamicFormId,
    scriptId: selectedScriptId,
    dynamicFormId,
    programName: drawerForm.programName,
    logoPath: drawerForm.logoPath,
    programCategory: drawerForm.programCategory,
    currentForm: drawerForm.currentForm ||  [],
    extendedColumn: drawerForm.extendedColumn || [],
  };

  const nextIds = [...modelIds.value];
  if (currentEditId.value) {
    const editIndex = nextIds.findIndex((id) => id === currentEditId.value);
    if (editIndex > -1) {
      nextIds[editIndex] = dynamicFormId;
    } else if (!nextIds.includes(dynamicFormId)) {
      nextIds.push(dynamicFormId);
    }
    if (currentEditId.value !== dynamicFormId) {
      delete localScriptMap.value[currentEditId.value];
    }
  } else if (!nextIds.includes(dynamicFormId)) {
    nextIds.push(dynamicFormId);
  }

  localScriptMap.value[dynamicFormId] = newCard;
  const uniqueIds = [...new Set(nextIds)];
  emit('update:modelValue', uniqueIds);
  emit('change', uniqueIds);
  emit('changeDetail', buildProgramTypeList(uniqueIds));
  cancelFn();
}

function removeFn(row: ScriptCard) {
  const nextIds = modelIds.value.filter((id) => id !== row.id);
  delete localScriptMap.value[row.id];
  emit('update:modelValue', nextIds);
  emit('change', nextIds);
  emit('changeDetail', buildProgramTypeList(nextIds));
}
</script>

<template>
  <div class="flex">
    <template v-if="selectedScriptList.length">
      <el-tooltip
        v-for="item in selectedScriptList"
        :key="item.id"
        placement="top"
        :content="item.programName"
      >
        <div class="file-item">
          <el-avatar v-if="item.logoPath" :src="formatAssetImageUrl(item.logoPath)" :size="28" />
          <el-avatar v-else :size="28">
            {{ item.programName && item.programName.slice(0, 1) ? item.programName.slice(0, 1) : 'S' }}
          </el-avatar>
          <div class="program-name">{{ item.programName }}</div>
          <div class="icon-box">
            <el-icon class="icon" @click.stop="addTaskType(item)">
              <Edit />
            </el-icon>
            <el-icon class="icon" @click.stop="removeFn(item)">
              <Delete />
            </el-icon>
          </div>
        </div>
      </el-tooltip>
    </template>

    <div class="file-item add-box" @click="addTaskType()">
      <el-icon v-if="!scriptLoading"><Plus /></el-icon>
      <el-icon v-else class="is-loading"><Plus /></el-icon>
    </div>

    <el-drawer
      v-model="scriptDrawerVisible"
      class="script-selector-drawer"
      :title="drawerTitle"
      size="75%"
      :close-on-click-modal="false"
      destroy-on-close
      @close="cancelFn"
    >
      <div class="content">
        <SubmitForm
          ref="drawerSubmitFormRef"
          :base-form="drawerForm"
          :columns="drawerColumns"
          :rules="drawerRules"
        >
          <template #logoPath>
            <ImageUpload
              v-model="drawerForm.logoPath"
              file-format=".jpg,.jpeg,.png,.bmp,.gif"
              :file-size="5120"
              @change="() => drawerSubmitFormRef?.validateField?.(['logoPath'])"
            />
          </template>

          <template #currentForm>
            <CurrentForm
              class="current-form"
              v-model="drawerForm.currentForm"
              :ext-columns="drawerForm.extendedColumn"
              @update:extColumns="(val) => (drawerForm.extendedColumn = val)"
            />
          </template>
        </SubmitForm>
      </div>

      <template #footer>
        <div class="footer-box">
          <el-button class="footer-btn" @click="cancelFn">{{ $t('common.cancel') }}</el-button>
          <el-button class="footer-btn" type="primary" @click="submitFn">{{ $t('common.confirm') }}</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.flex {
  display: flex;
  flex-wrap: wrap;
}

.file-item {
  width: 80px;
  height: 80px;
  margin: 0 8px 8px 0;
  padding: 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: column;
  line-height: 1;
}

.file-item:hover .icon-box {
  opacity: 1;
}

.program-name {
  width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.icon-box {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  background-color: rgb(0 0 0 / 50%);
  opacity: 0;
  transition: all 0.3s;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon {
  width: 16px;
  margin: 0 4px;
  color: rgb(255 255 255 / 85%);
  font-size: 16px;
  cursor: pointer;
}

.add-box {
  border: 1px dashed var(--el-border-color);
  background-color: var(--el-fill-color-light);
  cursor: pointer;
  transition: border-color 0.3s ease;
  justify-content: center;
}

.add-box:hover {
  border-color: var(--el-color-primary);
}

.content {
  width: 100%;
  padding: 4px 12px 0 0;
}

.content :deep(.el-form-item) {
  margin-bottom: 18px;
  align-items: flex-start;
}

.content :deep(.el-form-item__label) {
  line-height: 32px;
}

.content :deep(.el-form-item__content) {
  min-height: 32px;
}

.current-form {
  width: 100%;
}

.footer-box {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.footer-box .footer-btn {
  /* 覆盖全局/抽屉 footer 里可能出现的 flex:1，避免两按钮各占半宽 */
  flex: 0 0 auto !important;
  width: auto !important;
  margin: 0 !important;
}

.footer-box .footer-btn.el-button--primary {
  font-weight: 500;
}

.footer-box .footer-btn:not(.el-button--primary) {
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-blank);
  border-color: var(--el-border-color);
}

.footer-box .footer-btn:not(.el-button--primary):hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}
</style>

<style>
/* 覆盖抽屉 footer 默认布局，保证按钮整体居中 */
.script-selector-drawer .el-drawer__footer {
  display: flex;
  justify-content: center;
}
</style>
