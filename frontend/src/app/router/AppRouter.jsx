import { Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { StudentLayout } from '../../components/layout/StudentLayout';
import { TeacherLayout } from '../../components/layout/TeacherLayout';
import { HomePage } from '../../pages/public/HomePage';
import { AboutPage } from '../../pages/public/AboutPage';
import { AccessibilityPage } from '../../pages/public/AccessibilityPage';
import { LoginPage } from '../../pages/auth/LoginPage';
import { RegisterPage } from '../../pages/auth/RegisterPage';
import { OnboardingPage } from '../../pages/student/OnboardingPage';
import { DiagnosticPage } from '../../pages/student/DiagnosticPage';
import { StudentDashboardPage } from '../../pages/student/StudentDashboardPage';
import { LearningPathPage } from '../../pages/student/LearningPathPage';
import { KnowledgeMapPage } from '../../pages/student/KnowledgeMapPage';
import { LessonPage } from '../../pages/student/LessonPage';
import { TaskPage } from '../../pages/student/TaskPage';
import { ProgressPage } from '../../pages/student/ProgressPage';
import { AchievementsPage } from '../../pages/student/AchievementsPage';
import { SettingsPage } from '../../pages/student/SettingsPage';
import { AssistantPage } from '../../pages/student/AssistantPage';
import { PlanGenerationPage } from '../../pages/student/PlanGenerationPage';
import { StudentClassPage } from '../../pages/student/StudentClassPage';
import { TeacherDashboardPage } from '../../pages/teacher/TeacherDashboardPage';
import { ClassDetailsPage } from '../../pages/teacher/ClassDetailsPage';
import { StudentDetailsPage } from '../../pages/teacher/StudentDetailsPage';
import { ContentLibraryPage } from '../../pages/teacher/ContentLibraryPage';
import { ContentEditorPage } from '../../pages/teacher/ContentEditorPage';
import { DesignSystemPage } from '../../pages/teacher/DesignSystemPage';
import { TeacherAssignmentsPage } from '../../pages/teacher/TeacherAssignmentsPage';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '../../pages/admin/AdminUsersPage';
import { AdminClassesPage } from '../../pages/admin/AdminClassesPage';
import { AdminModerationPage } from '../../pages/admin/AdminModerationPage';
import { AdminSystemPage } from '../../pages/admin/AdminSystemPage';
import { AdminAuditPage } from '../../pages/admin/AdminAuditPage';
import { NotFoundPage } from '../../pages/shared/NotFoundPage';
import { ProtectedRoute } from '../../components/common/ProtectedRoute';
import { RoleRoute } from '../../components/common/RoleRoute';

export function AppRouter() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/accessibility" element={<AccessibilityPage />} />
      <Route path="/ui-kit" element={<DesignSystemPage />} />
    </Route>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<RoleRoute role="student" />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="diagnostic" element={<DiagnosticPage />} />
          <Route path="generating-plan" element={<PlanGenerationPage />} />
          <Route path="dashboard" element={<StudentDashboardPage />} />
          <Route path="path" element={<LearningPathPage />} />
          <Route path="knowledge-map" element={<KnowledgeMapPage />} />
          <Route path="learn/:moduleId" element={<LessonPage />} />
          <Route path="task/:taskId" element={<TaskPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="achievements" element={<AchievementsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="class" element={<StudentClassPage />} />
          <Route path="classes/:classId" element={<StudentClassPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="teacher" />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route path="dashboard" element={<TeacherDashboardPage />} />
          <Route path="classes/:classId" element={<ClassDetailsPage />} />
          <Route path="students/:studentId" element={<StudentDetailsPage />} />
          <Route path="content" element={<ContentLibraryPage />} />
          <Route path="content/new" element={<ContentEditorPage />} />
          <Route path="content/:moduleId/edit" element={<ContentEditorPage />} />
          <Route path="assignments" element={<TeacherAssignmentsPage />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="classes" element={<AdminClassesPage />} />
          <Route path="content" element={<ContentLibraryPage />} />
          <Route path="content/new" element={<ContentEditorPage />} />
          <Route path="content/:moduleId/edit" element={<ContentEditorPage />} />
          <Route path="moderation" element={<AdminModerationPage />} />
          <Route path="system" element={<AdminSystemPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
