<script lang="ts" setup>
import { computed, reactive, ref, watch } from 'vue';

import { ElAutocomplete, ElMessage } from 'element-plus';

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

function getSuiteNameSuggestions(queryString = '') {
  const keyword = queryString.trim().toLowerCase();
  return suiteOptions.value
    .filter((item) => Boolean(item?.suiteName))
    .filter((item) => {
      if (!keyword) return true;
      return (item.suiteName ?? '').toLowerCase().includes(keyword);
    })
    .map((item) => ({
      value: item.suiteName ?? '',
      suiteDesc: item.suiteDesc,
    }));
}

function fetchSuiteSuggestions(
  queryString: string,
  callback: (items: Array<{ value: string; suiteDesc?: string }>) => void,
) {
  callback(getSuiteNameSuggestions(queryString));
}

function onSuiteAutocompleteSelect(item: Record<string, any>) {
  const val = String(item?.value ?? '');
  form.suiteName = val;
  const hit = suiteOptions.value.find((s) => s.suiteName === val);
  if (hit) {
    form.suiteDesc = hit.suiteDesc ?? form.suiteDesc;
  }
}

const dialogTitle = computed(() => {
  const initial = props.initial ?? {};
  return initial.suiteId
    ? $t('systemManage.groupManage.editGroup')
    : $t('systemManage.groupManage.addGroup');
});

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

watch(visible, async (v) => {
  if (!v) return;
  await loadSuiteOptions();
  const p = props.initial ?? {};
  form.id = p.id;
  form.suiteName = p.suiteName ?? '';
  form.suiteDesc = p.suiteDesc ?? '';
});

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
      suiteId: hit?.id,
      suiteName: form.suiteName,
      suiteDesc: form.suiteDesc,
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
    :title="dialogTitle"
    width="640px"
    destroy-on-close
    @closed="formRef?.resetFields?.()"
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="100px">
      <ElFormItem :label="$t('systemManage.groupManage.groupName')" prop="suiteName">
        <ElAutocomplete
          v-model="form.suiteName"
          value-key="value"
          :fetch-suggestions="fetchSuiteSuggestions"
          clearable
          :trigger-on-focus="true"
          :maxlength="50"
          :placeholder="$t('systemManage.groupManage.pleaseInputGroupName')"
          style="width: 100%"
          @select="onSuiteAutocompleteSelect"
        />
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

