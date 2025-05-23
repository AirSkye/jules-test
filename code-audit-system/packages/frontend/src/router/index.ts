import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';
import DashboardView from '@/views/DashboardView.vue';
import RuleManagementView from '@/views/RuleManagementView.vue';
import RuleEditorView from '@/views/RuleEditorView.vue'; // Import RuleEditorView
import ProjectManagementView from '@/views/ProjectManagementView.vue';
import VulnerabilityAnalysisView from '@/views/VulnerabilityAnalysisView.vue';
import PocManagementView from '@/views/PocManagementView.vue';
import LogCenterView from '@/views/LogCenterView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: DashboardView,
      },
      {
        path: 'rules',
        name: 'RuleManagement',
        component: RuleManagementView,
      },
      {
        path: 'rules/new', // Route for creating a new rule
        name: 'RuleCreate', // Consistent naming for routes
        component: RuleEditorView,
      },
      {
        path: 'rules/edit/:id', // Route for editing an existing rule
        name: 'RuleEdit', // Consistent naming for routes
        component: RuleEditorView,
        props: true, // Pass route params as props
      },
      {
        path: 'projects',
        name: 'ProjectManagement',
        component: ProjectManagementView,
      },
      {
        path: 'vulnerabilities',
        name: 'VulnerabilityAnalysis',
        component: VulnerabilityAnalysisView,
      },
      {
        path: 'pocs',
        name: 'PocManagement',
        component: PocManagementView,
      },
      {
        path: 'logs',
        name: 'LogCenter',
        component: LogCenterView,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
