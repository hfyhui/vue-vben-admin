<script lang="ts" setup>
import { useProjectionDeviceActions } from '#/composables/useProjectionDeviceActions';

const props = defineProps<{
  device: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'refresh-success'): void;
}>();

const { hoverRunPowerOrRestart, hoverRunRefresh } = useProjectionDeviceActions();

const menuItems = [
  { key: 'SHUTDOWN', title: 'webadb.scrcpy.shutdown', icon: 'icon-guanjioff' },
  { key: 'POWER_ON', title: 'webadb.scrcpy.powerOn', icon: 'icon-guanjion' },
  { key: 'RESTART', title: 'webadb.scrcpy.restart', icon: 'icon-zhongqi' },
  { key: 'REFRESH', title: 'webadb.scrcpy.refresh', icon: 'icon-shuaxin' },
];

async function oneClick(operation: string) {
  const deviceId = props.device?.deviceId;
  if (deviceId === undefined || deviceId === null) return;

  if (operation === 'REFRESH') {
    await hoverRunRefresh(deviceId, () => emit('refresh-success'));
    return;
  }

  await hoverRunPowerOrRestart(props.device, operation);
}
</script>

<template>
  <ul class="hover-header">
    <li v-for="item in menuItems" :key="item.key">
      <el-tooltip  placement="top" :show-after="120" :content="$t(item.title)">
        <i class="icon iconfont" :class="item.icon" @click.stop="oneClick(item.key)" />
      </el-tooltip>
    </li>
  </ul>
</template>

<style lang="less" scoped>
.hover-header {
  align-items: center;
  display: none;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 99;

  li {
    display: flex;
    flex: 1;
    justify-content: center;
  }

  .iconfont {
    cursor: pointer;
  }

  .iconfont:hover {
    color: #40a9ff;
  }

  .icon-guanjioff {
    color: rgb(155, 155, 155);
  }

  .icon-guanjion {
    color: rgb(123, 181, 128);
  }

  .icon-zhongqi {
    color: rgb(85, 156, 195);
  }

  .icon-shuaxin {
    color: rgb(112, 151, 220);
  }
}
</style>
