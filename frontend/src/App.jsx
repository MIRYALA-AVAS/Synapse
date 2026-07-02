import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import AppLayout from './components/layout/AppLayout'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForumPage from './pages/ForumPage'
import ForumPostDetailPage from './pages/ForumPostDetailPage'
import TrendingPage from './pages/TrendingPage'
import SpacesListPage from './pages/SpacesListPage'
import SpaceDetailPage from './pages/SpaceDetailPage'
import DMListPage from './pages/DMListPage'
import DMConversationPage from './pages/DMConversationPage'
import MyCommentsPage from './pages/MyCommentsPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import EditProfilePage from './pages/EditProfilePage'

function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/:postId" element={<ForumPostDetailPage />} />
          <Route path="/trending" element={<TrendingPage />} />
          <Route path="/spaces" element={<SpacesListPage />} />
          <Route path="/spaces/:slug" element={<SpaceDetailPage />} />
          <Route path="/dm" element={<DMListPage />} />
          <Route path="/dm/:userId" element={<DMConversationPage />} />
          <Route path="/my-comments" element={<MyCommentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile/:userId" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/forum" replace />} />
    </Routes>
  )
}

export default App
