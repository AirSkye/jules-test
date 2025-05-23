<template>
  <div class="rule-management-view">
    <h1>规则管理</h1>

    <!-- Action Buttons and Filters -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="24">
        <el-button type="primary" @click="handleCreateRule" :icon="Plus">创建规则</el-button>
        <el-button @click="triggerFileInput" :icon="Upload">导入规则</el-button>
        <input type="file" ref="fileInput" @change="handleFileImport" accept=".json" style="display: none" />
        <el-button @click="handleExportRules" :icon="Download">导出规则</el-button>
      </el-col>
    </el-row>
     <el-row :gutter="20" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-select v-model="filterLanguage" placeholder="按语言筛选" clearable @change="applyFiltersAndSort">
          <el-option v-for="lang in uniqueLanguages" :key="lang" :label="lang" :value="lang" />
        </el-select>
      </el-col>
      <el-col :span="6">
        <el-select v-model="filterSeverity" placeholder="按严重性筛选" clearable @change="applyFiltersAndSort">
          <el-option label="High" value="high" />
          <el-option label="Medium" value="medium" />
          <el-option label="Low" value="low" />
          <el-option label="Info" value="info" />
        </el-select>
      </el-col>
      <el-col :span="6">
        <el-input v-model="filterTags" placeholder="按标签搜索 (逗号分隔)" clearable @input="applyFiltersAndSort" />
      </el-col>
       <el-col :span="6">
        <el-input v-model="filterName" placeholder="按规则名称搜索" clearable @input="applyFiltersAndSort" />
      </el-col>
    </el-row>

    <!-- Rules Table -->
    <el-table :data="paginatedRules" style="width: 100%" border stripe sortable="custom" @sort-change="handleSortChange">
      <el-table-column prop="id" label="规则ID" sortable="custom" width="180" />
      <el-table-column prop="language" label="语言" sortable="custom" width="100" />
      <el-table-column prop="name" label="规则名称" sortable="custom" show-overflow-tooltip />
      <el-table-column prop="severity" label="严重性" sortable="custom" width="110">
        <template #default="{ row }">
          <el-tag :type="severityTagType(row.severity)">{{ row.severity }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="tags" label="标签" width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag v-for="tag in row.tags" :key="tag" type="info" style="margin-right: 5px; margin-bottom: 5px;">{{ tag }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="enabled" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-switch 
            v-model="row.enabled" 
            @change="handleToggleStatus(row.id)"
            :active-text="row.enabled ? '启用' : '禁用'" 
            inline-prompt
            size="small"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :icon="Edit" @click="handleEditRule(row)" circle title="编辑"/>
          <el-button size="small" type="danger" :icon="Delete" @click="handleDeleteRule(row.id)" circle title="删除"/>
        </template>
      </el-table-column>
    </el-table>

    <!-- Pagination -->
    <el-pagination
      style="margin-top: 20px;"
      :current-page="currentPage"
      :page-sizes="[10, 20, 50, 100]"
      :page-size="pageSize"
      layout="total, sizes, prev, pager, next, jumper"
      :total="sortedAndFilteredRules.length"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { ElTable } from 'element-plus';
import { Plus, Upload, Download, Edit, Delete } from '@element-plus/icons-vue';
import { 
  getAllRules, 
  deleteRule as deleteRuleFromStore, 
  toggleRuleStatus as toggleRuleStatusInStore,
  Rule,
  addMultipleRules
} from '@/store/mockRuleStore';

const router = useRouter();
const storeRules = ref<Rule[]>(getAllRules()); // Initial fetch, will be watched for reactivity

// This watcher ensures that if rules are added/deleted externally to this component's lifecycle,
// (e.g. after an import or from RuleEditorView), the local `storeRules` ref is updated.
// However, since getAllRules() from the store already returns a reactive object (if the store's internal array is reactive),
// direct usage of a computed property on getAllRules() might be more idiomatic for Vue 3.
// For now, keeping this explicit watch to ensure updates if getAllRules() wasn't deeply reactive by itself.
watch(getAllRules, (newRules) => {
  storeRules.value = newRules;
}, { deep: true });


const filterLanguage = ref('');
const filterSeverity = ref('');
const filterTags = ref('');
const filterName = ref(''); // New filter for rule name

const uniqueLanguages = computed(() => {
  const langs = new Set(storeRules.value.map(rule => rule.language));
  return Array.from(langs).sort();
});

const currentSort = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({
  prop: 'id',
  order: 'ascending',
});

const sortedAndFilteredRules = computed(() => {
  let rules = [...storeRules.value]; // Use the local reactive ref

  // Name filter
  if (filterName.value) {
    rules = rules.filter(rule => rule.name.toLowerCase().includes(filterName.value.toLowerCase()));
  }

  // Language filter
  if (filterLanguage.value) {
    rules = rules.filter(rule => rule.language === filterLanguage.value);
  }

  // Severity filter
  if (filterSeverity.value) {
    rules = rules.filter(rule => rule.severity === filterSeverity.value);
  }

  // Tags filter
  if (filterTags.value) {
    const searchTags = filterTags.value.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
    if (searchTags.length > 0) {
      rules = rules.filter(rule => {
        const ruleTagsLower = rule.tags.map(t => t.toLowerCase());
        return searchTags.every(st => ruleTagsLower.some(rt => rt.includes(st)));
      });
    }
  }
  
  // Sorting
  if (currentSort.value.prop && currentSort.value.order) {
    rules.sort((a, b) => {
      const propA = a[currentSort.value.prop as keyof Rule];
      const propB = b[currentSort.value.prop as keyof Rule];
      
      let comparison = 0;
      if (propA > propB) comparison = 1;
      else if (propA < propB) comparison = -1;
      
      return currentSort.value.order === 'descending' ? comparison * -1 : comparison;
    });
  }
  return rules;
});


const currentPage = ref(1);
const pageSize = ref(10);

const paginatedRules = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return sortedAndFilteredRules.value.slice(start, end);
});

const severityTagType = (severity: 'high' | 'medium' | 'low' | 'info') => {
  if (severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  if (severity === 'low') return 'info';
  return 'primary'; // For 'info'
};

const handleSortChange = ({ prop, order }: { prop: string; order: 'ascending' | 'descending' | null }) => {
  currentSort.value = { prop, order };
};

const applyFiltersAndSort = () => {
  currentPage.value = 1; 
};

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
};

const handleCreateRule = () => {
  router.push({ name: 'RuleCreate' });
};

const handleEditRule = (rule: Rule) => {
  router.push({ name: 'RuleEdit', params: { id: rule.id } });
};

const handleDeleteRule = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除此规则吗？此操作无法撤销。', '警告', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    const success = deleteRuleFromStore(id);
    if (success) {
      ElMessage.success('规则已删除');
      // The list will update automatically due to reactivity from the store via storeRules ref and its watcher
    } else {
      ElMessage.error('删除失败，规则未找到');
    }
  } catch (e) {
    // User cancelled
    ElMessage.info('删除操作已取消');
  }
};

const handleToggleStatus = (id: string) => {
  const success = toggleRuleStatusInStore(id);
  if (success) {
    ElMessage.success(`规则状态已切换`);
     // Force refresh if storeRules is not updating correctly.
     // This might be needed if getAllRules() doesn't return a proxy or if the watcher isn't deep enough.
     // storeRules.value = [...getAllRules()]; 
  } else {
    ElMessage.error('状态切换失败，规则未找到');
  }
};

// Import/Export
const fileInput = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInput.value?.click();
};

const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedRules = JSON.parse(content) as Rule[];
        if (!Array.isArray(importedRules)) {
            throw new Error("Imported file is not a valid JSON array of rules.");
        }
        // Simple validation for required fields (can be expanded)
        for (const rule of importedRules) {
            if (!rule.id || !rule.name || !rule.language || !rule.pattern || !rule.severity) {
                throw new Error(`One or more rules are missing required fields (id, name, language, pattern, severity).`);
            }
        }

        const { importedCount, errors } = addMultipleRules(importedRules, true); // Allow overwrite for simplicity
        
        if (importedCount > 0) {
            ElMessage.success(`${importedCount} 条规则导入成功！`);
        }
        if (errors.length > 0) {
            errors.forEach(err => ElMessage.warning(err, { duration: 5000 }));
            ElMessage.error(`${errors.length} 条规则导入失败或被跳过。`);
        }
        if (importedCount === 0 && errors.length === 0) {
             ElMessage.info('没有导入新的规则或未找到可更新的规则。');
        }

      } catch (error: any) {
        ElMessage.error(`导入失败: ${error.message}`);
      } finally {
        // Reset file input to allow importing the same file again
        if (fileInput.value) {
          fileInput.value.value = '';
        }
      }
    };
    reader.readAsText(file);
  }
};

const handleExportRules = () => {
  const rulesToExport = getAllRules(); // Get current state from store
  if (rulesToExport.length === 0) {
    ElMessage.warning('没有规则可以导出。');
    return;
  }
  const jsonString = JSON.stringify(rulesToExport, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `rules_export_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  ElMessage.success('规则已导出！');
};

</script>

<style scoped>
.rule-management-view {
  padding: 20px;
}
.el-row {
  margin-bottom: 15px;
}
.el-select, .el-input {
  width: 100%;
}
.el-table th .cell {
  word-break: normal; /* Prevent header text from breaking mid-word */
}
.el-table .el-tag {
  margin-bottom: 5px; /* Add bottom margin to tags if they wrap */
}
.el-switch {
  --el-switch-on-color: var(--el-color-success);
  --el-switch-off-color: var(--el-color-danger);
}
</style>
