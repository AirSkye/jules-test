<template>
  <el-container style="height: 100vh;">
    <el-header style="display: flex; align-items: center; justify-content: space-between; background-color: #409EFF; color: white;">
      <span>代码审计系统</span>
      <el-button type="primary" @click="toggleSidebar" style="color: white;">
        {{ isCollapsed ? '展开' : '收起' }}
      </el-button>
    </el-header>
    <el-container>
      <el-aside :width="isCollapsed ? '64px' : '200px'" style="background-color: #f4f4f5; transition: width 0.3s;">
        <SidebarMenu :is-collapsed="isCollapsed" />
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SidebarMenu from '@/components/SidebarMenu.vue';

const isCollapsed = ref(false);

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
.el-header {
  padding: 0 20px;
}
.el-aside {
  transition: width 0.3s ease-in-out;
}
</style>
