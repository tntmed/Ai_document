import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import UploadDocument from './pages/UploadDocument'
import DocumentDetail from './pages/DocumentDetail'
import ChiefReview from './pages/ChiefReview'
import Tasks from './pages/Tasks'
import MyTasks from './pages/MyTasks'
import DepartmentTasks from './pages/DepartmentTasks'
import RoutingRules from './pages/RoutingRules'
import Users from './pages/Users'
import Signatures from './pages/Signatures'
import Manual from './pages/Manual'

export default function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
      } />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/upload" element={<UploadDocument />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/chief-review" element={<ChiefReview />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/departments/:deptId/tasks" element={<DepartmentTasks />} />
          <Route path="/routing-rules" element={<RoutingRules />} />
          <Route path="/signatures" element={<Signatures />} />
          <Route path="/users" element={<Users />} />
          <Route path="/manual" element={<Manual />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
