import fs from 'fs';
import path from 'path';

const localizedFeatureFiles = [
  'pages/teacher/ContentLibraryPage.jsx',
  'pages/teacher/TeacherDashboardPage.jsx',
  'pages/teacher/ClassDetailsPage.jsx',
  'pages/teacher/StudentDetailsPage.jsx',
  'pages/admin/AdminDashboardPage.jsx',
  'pages/admin/AdminClassesPage.jsx',
  'pages/admin/AdminModerationPage.jsx',
  'pages/admin/AdminUsersPage.jsx',
  'pages/public/HomePage.jsx',
  'pages/student/StudentDashboardPage.jsx',
  'features/teacher-dashboard/StudentTable.jsx',
  'features/teacher-dashboard/ClassHeatmap.jsx',
  'widgets/teacher-analytics/TeacherAnalytics.jsx',
  'pages/student/AssistantPage.jsx',
  'pages/student/OnboardingPage.jsx',
  'pages/student/LearningPathPage.jsx',
  'pages/student/PlanGenerationPage.jsx',
  'pages/student/StudentClassPage.jsx',
  'pages/student/ProgressPage.jsx',
  'widgets/ai-companion/AiCompanion.jsx',
];

describe('localization coverage for content, analytics, and AI features', () => {
  test.each(localizedFeatureFiles)('%s has no hardcoded Cyrillic interface copy', (relativePath) => {
    const source = fs.readFileSync(path.join(__dirname, '..', '..', relativePath), 'utf8');
    expect(source).not.toMatch(/[А-Яа-яЁёҚқҒғҢңӘәӨөҰұҮүІіҺһ]/);
  });
});
