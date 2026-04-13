<script lang="ts" setup>
import { ref } from 'vue';

import { VIEW_REGEX_REFERENCE_ROWS } from './view-regex-reference';

const visible = ref(false);

function open() {
  visible.value = true;
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="$t('applicationManage.currentForm.viewRegex.title')"
    width="800px"
    append-to-body
    destroy-on-close
    class="view-regex-dialog"
  >
    <div class="regex-ref-grid">
      <template v-for="(item, idx) in VIEW_REGEX_REFERENCE_ROWS" :key="idx">
        <div class="cell label">{{ $t(item.labelKey) }}</div>
        <div class="cell value">{{ item.value }}</div>
      </template>
    </div>
  </el-dialog>
</template>

<style scoped>
.regex-ref-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  border: 1px solid var(--el-border-color);
  border-bottom: none;
}

.regex-ref-grid .label {
  border-right: 1px solid var(--el-border-color);
}

.regex-ref-grid .cell {
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}

.regex-ref-grid .value {
  color: var(--el-text-color-regular);
}
</style>
