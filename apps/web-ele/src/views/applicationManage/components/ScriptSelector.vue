<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';

import {
  getApplicationScriptListApi,
  type ApplicationScriptItem,
} from '#/api/core/application';
import ImageUpload from '#/components/ImageUpload.vue';
import SubmitForm from '#/components/SubmitForm/index.vue';
import { useAssetEnumsStore } from '#/store';
import CurrentForm from './currentForm/index.vue';

type ScriptCard = {
  id: string;
  scriptId: string;
  programName: string;
  logoPath?: string;
  programCategory?: string;
  currentForm?: any[];
  extendedColumn?: any[];
};

const props = defineProps<{
  modelValue?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
  (e: 'change', value: string[]): void;
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
  return (props.modelValue || []).filter(Boolean);
});

const scriptSelectOptions = computed(() =>
  scriptOptionsRaw.value.map((item: any) => ({
    value: item.id,
    label: item.programName,
    logoPath: item.logoPath,
    programCategory: item.programCategory,
  })),
);

const scriptCategoryOptions = computed(() => {
  const mobileTaskCategory = assetEnumsStore.getEnumByKey<any>('MOBILE_TASK_CATEGORY');
  const categoryList = mobileTaskCategory?.children || mobileTaskCategory || [];

  const dictOptions = categoryList
    .map((item: any) => ({
      label: item?.content || item?.label || item?.name || item?.value || '',
      value: item?.name || item?.value || item?.code || item?.content || '',
    }))
    .filter((item: any) => item.label && item.value);

  if (dictOptions.length) return dictOptions;

  const categories = scriptSelectOptions.value.map((item) => item.programCategory).filter(Boolean);
  return [...new Set(categories)].map((item) => ({ label: item, value: item }));
});

const selectedScriptList = computed<ScriptCard[]>(() =>
  modelIds.value.map((id) => {
    const local = localScriptMap.value[id];
    const fromApi = scriptSelectOptions.value.find((op) => op.value === id);
    return {
      id,
      scriptId: id,
      programName: local?.programName || fromApi?.label || `脚本-${id}`,
      logoPath: local?.logoPath || fromApi?.logoPath || '',
      programCategory: local?.programCategory || fromApi?.programCategory || '',
      currentForm: local?.currentForm || [],
      extendedColumn: local?.extendedColumn || [],
    };
  }),
);

const drawerTitle = computed(() => (currentEditId.value ? '编辑脚本' : '新增脚本'));

const drawerColumns = computed<any[]>(() => [
  {
    type: 'input' as const,
    label: '脚本名称',
    prop: 'programName',
    maxLength: 20,
    placeholder: '请输入脚本名称',
    rules: [{ required: true, message: '请输入脚本名称' }],
  },
  {
    type: 'customInput' as const,
    label: '脚本Logo',
    prop: 'logoPath',
    slot: 'logoPath',
    rules: [{ required: true, message: '请上传脚本Logo' }],
  },
  {
    type: 'select' as const,
    label: '脚本类型',
    prop: 'programCategory',
    options: scriptCategoryOptions.value,
    placeholder: '请选择脚本类型',
  },
  {
    type: 'select' as const,
    label: '脚本',
    prop: 'scriptId',
    options: scriptSelectOptions.value,
    placeholder: '请选择脚本',
    rules: [{ required: true, message: '请选择脚本' }],
    change: onScriptIdChange,
  },
  {
    type: 'customInput' as const,
    label: '表单',
    prop: 'currentForm',
    slot: 'currentForm',
  },
]);

const drawerRules = {
  programName: [{ required: true, message: '请输入脚本名称', trigger: 'blur' }],
  logoPath: [{ required: true, message: '请上传脚本Logo', trigger: 'change' }],
  scriptId: [{ required: true, message: '请选择脚本', trigger: 'change' }],
};

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
    ElMessage.warning('脚本清单加载失败，请稍后重试');
  } finally {
    scriptLoading.value = false;
  }
}

function resetDrawerForm() {
  drawerForm.id = '';
  drawerForm.scriptId = '';
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
  const current = scriptSelectOptions.value.find((item) => item.value === value);
  if (!current) return;
  if (!drawerForm.programName) {
    drawerForm.programName = current.label;
  }
  if (!drawerForm.logoPath) {
    drawerForm.logoPath = current.logoPath;
  }
  if (!drawerForm.programCategory) {
    drawerForm.programCategory = current.programCategory;
  }
}

async function submitFn() {
  const valid = await drawerSubmitFormRef.value?.validateFn?.();
  if (!valid) {
    return;
  }
  const newId = drawerForm.scriptId;
  if (!newId) return;

  const newCard: ScriptCard = {
    id: newId,
    scriptId: newId,
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
      nextIds[editIndex] = newId;
    } else if (!nextIds.includes(newId)) {
      nextIds.push(newId);
    }
    if (currentEditId.value !== newId) {
      delete localScriptMap.value[currentEditId.value];
    }
  } else if (!nextIds.includes(newId)) {
    nextIds.push(newId);
  }

  localScriptMap.value[newId] = newCard;
  const uniqueIds = [...new Set(nextIds)];
  emit('update:modelValue', uniqueIds);
  emit('change', uniqueIds);
  cancelFn();
}

function removeFn(row: ScriptCard) {
  const nextIds = modelIds.value.filter((id) => id !== row.id);
  delete localScriptMap.value[row.id];
  emit('update:modelValue', nextIds);
  emit('change', nextIds);
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
          <el-avatar v-if="item.logoPath" :src="item.logoPath" :size="28" />
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
              v-model="drawerForm.currentForm"
              :ext-columns="drawerForm.extendedColumn"
              @update:extColumns="(val) => (drawerForm.extendedColumn = val)"
            />
          </template>
        </SubmitForm>
      </div>

      <template #footer>
        <div class="footer-box">
          <el-button @click="cancelFn">关闭</el-button>
          <el-button type="primary" @click="submitFn">确定</el-button>
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

.footer-box {
  display: flex;
  justify-content: center;
  gap: 8px;
}
</style>
