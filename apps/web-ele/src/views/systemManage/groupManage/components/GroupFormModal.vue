<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import {
  getSocialSuitePageApi,
  updateSocialSuiteApi,
} from '#/api/core/social-suite';
import { $t } from '#/locales';

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const props = defineProps<{
  /** 编辑时传入详情；新增为空对象 */
  initial?: Record<string, any> | null;
}>();

const formRef = ref();
const loading = ref(false);
const suiteNameKeyword = ref('');
const suiteOptions = ref<Array<{ id: string; suiteName: string; suiteDesc?: string }>>(
  [],
);

const form = reactive({
  id: '' as string | undefined,
  suiteName: '',
  suiteDesc: '',
});

const rules = computed(() => ({
  suiteName: [
    {
      required: true,
      message: $t('systemManage.groupManage.pleaseInputGroupName'),
      trigger: 'blur',
    },
    {
      max: 50,
      message: '分组名称长度不能超过50个字符',
      trigger: 'blur',
    },
  ],
}));

const filteredSuiteOptions = computed(() => {
  const keyword = suiteNameKeyword.value.trim().toLowerCase();
  if (!keyword) return suiteOptions.value;
  return suiteOptions.value.filter((item) =>
    item.suiteName.toLowerCase().includes(keyword),
  );
});

const suiteSelectPopperClass = computed(() =>
  suiteNameKeyword.value.trim() && !filteredSuiteOptions.value.length
    ? 'group-suite-select-popper group-suite-select-popper--hidden'
    : 'group-suite-select-popper',
);

function successCode(code: number) {
  return code === 200 || code === 100000;
}

async function loadSuiteOptions() {
  try {
    const res = await getSocialSuitePageApi({ current: 1, size: 200 });
    if (res && successCode(res.code)) {
      suiteOptions.value = (res.data?.records ?? []).map((r: any) => ({
        id: r.id,
        suiteName: r.suiteName,
        suiteDesc: r.suiteDesc,
      }));
      return;
    }
  } catch {
    /* client */
  }
  suiteOptions.value = [];
}

function syncSuiteDescByName(name: string) {
  suiteNameKeyword.value = name ?? '';
  const hit = suiteOptions.value.find(
    (s) => s.suiteName === name,
  );
  form.suiteDesc = hit?.suiteDesc ?? form.suiteDesc;
}

function onSuiteFilter(query: string) {
  suiteNameKeyword.value = query;
}

function onSuiteBlur() {
  const keyword = suiteNameKeyword.value.trim();
  if (keyword && keyword !== form.suiteName) {
    form.suiteName = keyword;
    formRef.value?.clearValidate?.('suiteName');
  }
}

watch(visible, async (v) => {
  if (!v) return;
  await loadSuiteOptions();
  suiteNameKeyword.value = '';
  const p = props.initial ?? {};
  form.id = p.id;
  form.suiteName = p.suiteName ?? '';
  form.suiteDesc = p.suiteDesc ?? '';
});

async function onSuiteSelectVisibleChange(open: boolean) {
  if (!open || suiteOptions.value.length) return;
  await loadSuiteOptions();
}

function close() {
  visible.value = false;
  formRef.value?.resetFields?.();
}

async function submit() {
  const valid = await formRef.value
    ?.validate()
    .then(() => true)
    .catch(() => false);
  if (!valid) return;

  loading.value = true;
  try {
    const initial = (props.initial ?? {}) as Record<string, any>;
    const hit = suiteOptions.value.find(
      (s) => s.suiteName === form.suiteName,
    );
    const payload: Record<string, any> = {
      id: initial.id,
      suiteName: form.suiteName,
      suiteDesc: form.suiteDesc,
      suiteId: hit?.id,
      suiteType: initial.suiteType,
    };
    payload.mobiles = Array.isArray(initial.suiteOrgs) ? [...initial.suiteOrgs] : [];

    const res = await updateSocialSuiteApi(payload);
    if (res && successCode(res.code)) {
      ElMessage.success($t('systemManage.opSuccess'));
      close();
      emit('success');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="$t('systemManage.groupManage.deviceGroup')"
    width="640px"
    destroy-on-close
    @closed="formRef?.resetFields?.()"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
      <ElFormItem :label="$t('systemManage.groupManage.groupName')" prop="suiteName">
        <ElSelect
          v-model="form.suiteName"
          filterable
          clearable
          no-data-text=""
          no-match-text=""
          :teleported="false"
          :placeholder="$t('systemManage.groupManage.pleaseInputGroupName')"
          style="width: 100%"
          :popper-class="suiteSelectPopperClass"
          :filter-method="onSuiteFilter"
          @change="syncSuiteDescByName"
          @blur="onSuiteBlur"
          @visible-change="onSuiteSelectVisibleChange"
        >
          <template #empty />
          <ElOption
            v-for="s in filteredSuiteOptions"
            :key="s.id"
            :label="s.suiteName"
            :value="s.suiteName"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem :label="$t('systemManage.groupManage.groupDesc')" prop="suiteDesc">
        <ElInput
          v-model="form.suiteDesc"
          type="textarea"
          :rows="4"
          maxlength="200"
          show-word-limit
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="close">{{ $t('common.cancel') }}</ElButton>
      <ElButton type="primary" :loading="loading" @click="submit">
        {{ $t('common.confirm') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
:deep(.group-suite-select-popper--hidden) {
  display: none !important;
}
</style>
