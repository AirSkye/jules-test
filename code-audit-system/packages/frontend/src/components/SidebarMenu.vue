<template>
  <el-menu
    :collapse="isCollapsed"
    default-active="0"
    class="el-menu-vertical-demo"
    router
  >
    <el-menu-item index="/">
      <el-icon><icon-menu /></el-icon>
      <template #title>仪表盘</template>
    </el-menu-item>
    <el-menu-item index="/rules">
      <el-icon><icon-setting /></el-icon>
      <template #title>规则管理</template>
    </el-menu-item>
    <el-menu-item index="/projects">
      <el-icon><icon-folder /></el-icon>
      <template #title>项目管理</template>
    </el-menu-item>
    <el-menu-item index="/vulnerabilities">
      <el-icon><icon-warning /></el-icon>
      <template #title>漏洞分析</template>
    </el-menu-item>
    <el-menu-item index="/pocs">
      <el-icon><icon-document /></el-icon>
      <template #title>POC管理</template>
    </el-menu-item>
    <el-menu-item index="/logs">
      <el-icon><icon-notebook /></el-icon>
      <template #title>日志中心</template>
    </el-menu-item>
  </el-menu>
</template>

<script setup lang="ts">
import {
  Menu as IconMenu,
  Setting as IconSetting,
  Folder as IconFolder,
  Warning as IconWarning,
  Document as IconDocument,
  Notebook as IconNotebook,
} from '@element-plus/icons-vue'

defineProps<{
  isCollapsed: boolean
}>();
</script>

<style scoped>
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 200px;
  min-height: 400px;
}
.el-menu {
  height: 100%;
}
</style>
