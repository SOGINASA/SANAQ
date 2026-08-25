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
  'pages/admin/AdminSystemPage.jsx',
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

  test('production UI code has no hardcoded Cyrillic copy outside localization data', () => {
    const sourceRoot = path.join(__dirname, '..', '..');
    const visit = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (absolute === __dirname || absolute === path.join(sourceRoot, 'shared', 'data')) return [];
        return visit(absolute);
      }
      if (!/\.(?:js|jsx)$/.test(entry.name) || /\.test\.(?:js|jsx)$/.test(entry.name)) return [];
      return [absolute];
    });
    const offenders = visit(sourceRoot).filter((file) => /[А-Яа-яЁёҚқҒғҢңӘәӨөҰұҮүІіҺһ]/.test(fs.readFileSync(file, 'utf8')));
    expect(offenders.map((file) => path.relative(sourceRoot, file))).toEqual([]);
  });
});
