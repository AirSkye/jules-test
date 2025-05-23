<template>
  <div class="rule-editor-view">
    <el-page-header @back="goBack" :content="pageTitle" style="margin-bottom: 20px;" />

    <el-form :model="ruleForm" :rules="formRules" ref="ruleFormRef" label-position="top">
      <el-row :gutter="30">
        <!-- Left Panel: Metadata Form -->
        <el-col :span="10">
          <el-card shadow="never" style="height: 100%;">
            <template #header>
              <div class="card-header">
                <span>规则元数据</span>
              </div>
            </template>

            <el-form-item label="规则ID" prop="id">
              <el-input v-model="ruleForm.id" :disabled="isEditing" placeholder="例如: java_sqli_001"></el-input>
            </el-form-item>

            <el-form-item label="语言" prop="language">
              <el-select v-model="ruleForm.language" placeholder="选择语言" style="width: 100%;" @change="updateEditorLanguage">
                <el-option label="Java" value="java"></el-option>
                <el-option label="Python" value="python"></el-option>
                <el-option label="JavaScript" value="javascript"></el-option>
                <el-option label="C#" value="csharp"></el-option>
                <el-option label="Go" value="go"></el-option>
                <el-option label="Ruby" value="ruby"></el-option>
                <el-option label="PHP" value="php"></el-option>
                <el-option label="Scala" value="scala"></el-option>
                <el-option label="Plain Text" value="plaintext"></el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="规则名称" prop="name">
              <el-input v-model="ruleForm.name" placeholder="例如: SQL Injection Detection"></el-input>
            </el-form-item>

            <el-form-item label="描述" prop="description">
              <el-input type="textarea" :rows="3" v-model="ruleForm.description" placeholder="规则的详细描述"></el-input>
            </el-form-item>

            <el-form-item label="严重性" prop="severity">
              <el-select v-model="ruleForm.severity" placeholder="选择严重性" style="width: 100%;">
                <el-option label="High" value="high"></el-option>
                <el-option label="Medium" value="medium"></el-option>
                <el-option label="Low" value="low"></el-option>
                <el-option label="Info" value="info"></el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="标签 (按 Enter 添加)" prop="tags">
              <el-select
                v-model="ruleForm.tags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="例如: sqli, web, security"
                style="width: 100%;"
                :reserve-keyword="false"
              >
              </el-select>
            </el-form-item>

            <el-form-item label="修复建议" prop="remediation">
              <el-input type="textarea" :rows="3" v-model="ruleForm.remediation" placeholder="如何修复此问题"></el-input>
            </el-form-item>
            
            <el-form-item label="状态" prop="enabled">
               <el-switch v-model="ruleForm.enabled" active-text="启用" inactive-text="禁用" />
            </el-form-item>

          </el-card>
        </el-col>

        <!-- Right Panel: Code Editor -->
        <el-col :span="14">
          <el-card shadow="never" style="height: 100%;">
            <template #header>
              <div class="card-header">
                <span>规则代码 (Pattern)</span>
              </div>
            </template>
            <div class="editor-container" style="height: calc(100vh - 330px);">
                 <monaco-editor
                    v-if="showEditor"
                    v-model="ruleForm.pattern"
                    :language="editorLanguage"
                    :options="editorOptions"
                    theme="vs-dark"
                 />
            </div>
            <el-form-item prop="pattern" style="display: none;"></el-form-item>
          </el-card>
        </el-col>
      </el-row>

      <el-row justify="end" style="margin-top: 20px;">
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="isSaving">保存规则</el-button>
      </el-row>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import MonacoEditor from 'monaco-editor-vue3';
import { 
  getRuleById, 
  addRule, 
  updateRule, 
  Rule,
  getAllRules // For ID uniqueness check
} from '@/store/mockRuleStore';


const route = useRoute();
const router = useRouter();
const ruleFormRef = ref<FormInstance>();
const isSaving = ref(false);
const showEditor = ref(false); 

const ruleIdFromRoute = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => !!ruleIdFromRoute.value);
const pageTitle = computed(() => (isEditing.value ? '编辑规则' : '创建新规则'));

const initialFormState: Rule = {
  id: '',
  language: 'plaintext',
  name: '',
  description: '',
  severity: 'medium',
  tags: [],
  pattern: '',
  remediation: '',
  enabled: true,
};

const ruleForm = reactive<Rule>({ ...initialFormState });

const editorLanguage = ref('plaintext');
const editorOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  fontSize: 14,
};

const updateEditorLanguage = () => {
  const langMap: { [key: string]: string } = {
    java: 'java', python: 'python', javascript: 'javascript', csharp: 'csharp',
    go: 'go', ruby: 'ruby', php: 'php', scala: 'scala', plaintext: 'plaintext',
  };
  editorLanguage.value = langMap[ruleForm.language] || 'plaintext';
};

watch(() => ruleForm.language, () => {
  updateEditorLanguage();
}, { immediate: true });

// Use a more specific name for form validation rules to avoid conflict with Rule interface
const formRules = reactive<FormRules<Rule>>({
  id: [
    { required: true, message: '规则ID不能为空', trigger: 'blur' },
    { pattern: /^[a-z0-9_.-]+$/, message: 'ID只能包含小写字母、数字、下划线、点和连字符', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (!isEditing.value) { // Only check for uniqueness when creating a new rule
          const existingRule = getRuleById(value); // Check against the store
          if (existingRule) {
            callback(new Error('该规则ID已存在'));
          } else {
            callback();
          }
        } else {
          callback(); // Don't validate ID uniqueness when editing (ID is disabled)
        }
      },
      trigger: 'blur',
    },
  ],
  language: [{ required: true, message: '请选择语言', trigger: 'change' }],
  name: [{ required: true, message: '规则名称不能为空', trigger: 'blur' }],
  severity: [{ required: true, message: '请选择严重性', trigger: 'change' }],
  pattern: [{ required: true, message: '规则代码不能为空', trigger: 'blur' }],
});

onMounted(async () => {
  if (isEditing.value && ruleIdFromRoute.value) {
    const existingRule = getRuleById(ruleIdFromRoute.value);
    if (existingRule) {
      // Create a deep copy to avoid modifying the store's reactive object directly before saving
      Object.assign(ruleForm, JSON.parse(JSON.stringify(existingRule)));
    } else {
      ElMessage.error(`规则 ID '${ruleIdFromRoute.value}' 未找到。将跳转到创建新规则页面。`);
      router.replace({ name: 'RuleCreate' }); // Redirect to create new if ID not found
      Object.assign(ruleForm, initialFormState); // Reset to initial state
    }
  } else {
    Object.assign(ruleForm, initialFormState); // Reset for new rule form
  }
  updateEditorLanguage(); 
  await nextTick();
  showEditor.value = true; 
});

const goBack = () => {
  router.push('/rules');
};

const handleSave = async () => {
  if (!ruleFormRef.value) return;
  isSaving.value = true;
  try {
    const isValid = await ruleFormRef.value.validate();
    if (isValid) {
      const ruleDataToSave = JSON.parse(JSON.stringify(ruleForm)); // Deep copy for saving
      
      let success = false;
      let message = '';

      if (isEditing.value && ruleIdFromRoute.value) {
        success = updateRule(ruleIdFromRoute.value, ruleDataToSave);
        message = success ? '规则更新成功！' : '规则更新失败 (可能未找到规则或无更改)。';
      } else {
        const addResult = addRule(ruleDataToSave);
        success = addResult.success;
        message = success ? '规则创建成功！' : (addResult.message || '规则创建失败。');
      }

      if (success) {
        ElMessage.success(message);
        goBack();
      } else {
        ElMessage.error(message);
      }
    } else {
      ElMessage.error('请检查表单输入项！');
    }
  } catch (error) {
    console.error("Error during form validation or save:", error);
    ElMessage.error('保存操作遇到问题，请稍后再试。');
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.rule-editor-view {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px); 
}

.el-form {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.el-row {
  flex-grow: 1;
}

.el-col {
  display: flex;
  flex-direction: column;
}

.el-card {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid #ebeef5;
}

.el-card ::v-deep(.el-card__body) {
 flex-grow: 1;
 display: flex;
 flex-direction: column;
 overflow-y: auto; 
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.el-form-item {
  margin-bottom: 18px; 
}

.editor-container {
  width: 100%;
  height: 100%; 
  min-height: 300px; 
  border: 1px solid #dcdfe6;
  box-sizing: border-box;
}

.editor-container ::v-deep(.monaco-editor) {
  width: 100% !important;
  height: 100% !important;
}
</style>
