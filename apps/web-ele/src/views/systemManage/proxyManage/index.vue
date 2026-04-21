<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { $t } from '#/locales';
</script>

<template>
  <Page auto-content-height>
    <div class="placeholder-page">
      <h3>{{ $t('page.dashboard.proxyManage') }}</h3>
      <p>页面建设中</p>
    </div>
  </Page>
</template>

<style scoped>
.placeholder-page {
  padding: 24px;
}
</style>
