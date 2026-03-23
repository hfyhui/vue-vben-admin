<script setup lang="ts">
import { $t } from '#/locales';

defineProps<{
  pinnedActive: boolean;
}>();

const emit = defineEmits<{
  (e: 'togglePin'): void;
}>();

function handlePinSelected() {
  emit('togglePin');
}
</script>

<template>
  <el-button :type="pinnedActive ? 'info' : 'warning'" @click="handlePinSelected">
    {{ pinnedActive ? $t('associationCenter.unpin') : $t('associationCenter.pin') }}
  </el-button>
</template>

<style scoped>
</style>
