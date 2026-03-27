<template>
  <div class="device-control-bar">
    <el-tooltip
      v-for="btn in buttons"
      :key="btn.key"
      :content="btn.content"
      placement="top"
      :hide-after="0"
    >
      <div class="control-btn" @click="e => handlePress(e, btn.key)">
        <i :class="`icon iconfont ${btn.icon}`"></i>
      </div>
    </el-tooltip>
  </div>
</template>

<script setup>
defineOptions({ name: 'DeviceOperateButton' });

const buttons = [
  { key: 'AndroidBack', content: '返回', icon: 'icon-back' },
  { key: 'AndroidHome', content: '主页', icon: 'icon-home' },
  { key: 'AndroidAppSwitch', content: '多任务', icon: 'icon-multitask' },
  { key: 'ContextMenu', content: '菜单', icon: 'icon-clear-speed' },
  { key: 'reconnect', content: '重连', icon: 'icon-shezhi' },
];

const emit = defineEmits(['reconnect', 'pressKey']);

function handlePress(_e, key) {
  if (key === 'reconnect') {
    emit('reconnect');
  } else {
    emit('pressKey', { e: _e, key });
  }
}
</script>

<style scoped lang="less">
@primary-bgc: rgb(92, 62, 92);

.device-control-bar {
  background-color: @primary-bgc;
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0;
  flex-shrink: 0;
  width: 100%;
}

.control-btn {
  flex: 1;
  cursor: pointer;
  padding: 5px 0;
  text-align: center;
  font-size: 16px;
  color: #fff;
  user-select: none;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  .icon {
    font-size: 16px;
  }

  &:hover {
    background-color: #40a9ff;
    color: #fff;
  }
}
</style>
