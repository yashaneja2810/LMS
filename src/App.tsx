import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { StudyMaterialProvider } from './pages/StudyMaterialContext'
import { Routes as NestedRoutes, Route as NestedRoute } from 'react-router-dom'

// Pages
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { TutorBot } from './pages/TutorBot'
import { Tests } from './pages/Tests'
import { Performance } from './pages/Performance'
import { Upload } from './pages/Upload'
import { Courses } from './pages/Courses'
import { StudyMaterial } from './pages/StudyMaterial'
import { SubtopicDetail } from './pages/SubtopicDetail'

function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/tutor" element={
            <ProtectedRoute>
              <Layout>
                <TutorBot />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/courses" element={
            <ProtectedRoute>
              <Layout>
                <Courses />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/tests" element={
            <ProtectedRoute>
              <Layout>
                <Tests />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/performance" element={
            <ProtectedRoute>
              <Layout>
                <Performance />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/upload" element={
            <ProtectedRoute>
              <Layout>
                <Upload />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Study Material routes with shared context */}
          <Route
            path="/study/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <StudyMaterialProvider>
                    <NestedRoutes>
                      <NestedRoute path="" element={<StudyMaterial />} />
                      <NestedRoute path=":topic/:subtopic" element={<SubtopicDetail />} />
                    </NestedRoutes>
                  </StudyMaterialProvider>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App