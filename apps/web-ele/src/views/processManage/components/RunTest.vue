<script setup lang="ts">
import { ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage, ElNotification } from 'element-plus';

import { useProcessVisualStore } from '#/store/modules/processVisual';
import { executeProcess, getDeviceList } from '#/api/core/processManage';

const props = defineProps<{
  visible: boolean;
  startNode?: string;
  endNode?: string;
  flowId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'close'): void;
}>();

const formRef = ref();
const model = ref({ phoneValue: '' });
const loading = ref(false);
const confirmLoading = ref(false);

const processVisualStore = useProcessVisualStore();
const { flow } = storeToRefs(processVisualStore);

interface PhoneItem {
  id: string;
  deviceIp: string;
  devicePort: string;
}

const phoneList = ref<PhoneItem[]>([]);
const pagination = ref({ current: 1, pageSize: 20, total: 0 });
const search = ref('');

function handleClose() {
  emit('update:visible', false);
  emit('close');
}

async function getPhoneList(reset = false) {
  loading.value = true;
  if (reset) pagination.value.current = 1;
  try {
    const deviceIp = search.value.split(':')[0] || '';
    const devicePort = search.value.split(':')[1] || '';
    const res: any = await getDeviceList({
      deviceStates: 'ONLINE',
      pageSize: pagination.value.pageSize,
      pageNum: pagination.value.current,
      userId: localStorage.getItem('user_id') || '',
      isShowAll: false,
      deviceIp,
      devicePort,
    });
    if (reset) {
      phoneList.value = res.results || [];
    } else {
      phoneList.value = [...phoneList.value, ...(res.results || [])];
    }
    pagination.value.total = res.count || 0;
  } finally {
    loading.value = false;
  }
}

function phoneSearch() {
  pagination.value.current = 1;
  getPhoneList(true);
}

function phonePopupScroll(e: Event) {
  if (phoneList.value.length >= pagination.value.total) return;
  const target = e.target as HTMLElement;
  const { scrollTop, scrollHeight, clientHeight } = target;
  if (scrollTop + 2 + clientHeight >= scrollHeight && !loading.value) {
    pagination.value.current++;
    getPhoneList();
  }
}

async function handleConfirm() {
  if (!model.value.phoneValue) {
    ElMessage.warning('请选择设备');
    return;
  }
  confirmLoading.value = true;
  try {
    const row = phoneList.value.find(
      (ele) => ele.id === model.value.phoneValue,
    );
    const phone = row ? `${row.deviceIp}:${row.devicePort}` : '';
    const res: any = await executeProcess({
      id: props.flowId || flow.value.id || '',
      start_node: props.startNode,
      end_node: props.endNode,
      phone,
    });
    if (res.task_id) {
      processVisualStore.setJobId(res.task_id);
      processVisualStore.setJobPhoneId(model.value.phoneValue);
    }
    ElNotification({
      title: '运行成功',
      message: '任务已启动',
      type: 'success',
    });
    emit('close');
  } catch {
    ElMessage.error('运行失败，请稍后重试');
  } finally {
    confirmLoading.value = false;
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      model.value.phoneValue = '';
      search.value = '';
      getPhoneList(true);
    }
  },
);
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="测试运行"
    width="520px"
    :close-on-click-modal="false"
    @close="handleClose"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
    <el-form ref="formRef" :model="model" label-width="100px">
      <el-form-item
        label="选择设备"
        prop="phoneValue"
        :rules="[{ required: true, message: '请选择设备', trigger: 'change' }]"
      >
        <el-select
          v-model="model.phoneValue"
          placeholder="请选择设备"
          filterable
          remote
          :remote-method="phoneSearch"
          :loading="loading"
          style="width: 100%"
          @visible-change="
            (v: boolean) => {
              if (!v) search = '';
            }
          "
        >
          <el-option
            v-for="item in phoneList"
            :key="item.id"
            :label="`${item.deviceIp}:${item.devicePort}`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="primary"
        :loading="confirmLoading"
        @click="handleConfirm"
      >
        运行
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped></style>
