<script lang="ts" setup>
const emit = defineEmits(['pressKey']);

type FooterButton = {
  key: string;
  i18nKey: string;
  icon: string;
};

const buttons: FooterButton[] = [
  { key: 'AndroidBack', i18nKey: 'common.back', icon: 'icon-back' },
  { key: 'AndroidHome', i18nKey: 'common.home', icon: 'icon-home' },
  { key: 'AndroidAppSwitch', i18nKey: 'common.task', icon: 'icon-multitask' },
  { key: 'ContextMenu', i18nKey: 'common.clear', icon: 'icon-clear-speed' },
  /** 与 social_media_web 一致：齿轮为「打开系统设置」，非重连（重连用小屏悬停刷新等） */
  { key: 'SetUp', i18nKey: 'common.settings', icon: 'icon-shezhi' },
];

function handlePress(e: MouseEvent, key: string) {
  emit('pressKey', { e, key });
}
</script>

<template>
  <div class="device-control-bar">
    <el-tooltip
      v-for="btn in buttons"
      :key="btn.key"
      :content="$t(btn.i18nKey)"
      placement="top"
      :hide-after="0"
    >
      <div class="control-btn" @click="handlePress($event, btn.key)">
        <i :class="`icon iconfont ${btn.icon}`"></i>
      </div>
    </el-tooltip>
  </div>
</template>

<style scoped lang="less">
@primary-bgc: rgb(92, 62, 92);

.device-control-bar {
  align-items: center;
  background-color: @primary-bgc;
  color: #fff;
  display: flex;
  flex-shrink: 0;
  padding: 0;
  width: 100%;
}

.control-btn {
  align-items: center;
  color: #fff;
  cursor: pointer;
  display: flex;
  flex: 1;
  font-size: 16px;
  justify-content: center;
  padding: 5px 0;
  text-align: center;
  transition: background-color 0.2s;
  user-select: none;

  .icon {
    font-size: 16px;
  }

  &:hover {
    background-color: #40a9ff;
    color: #fff;
  }
}
</style>
