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
import { PDFs } from './pages/PDFs'

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-teal-700">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-700 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function ScrollToTop() {
  const { pathname } = useLocation()
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [pathname])
  return null
}

function App() {
  return (
    <ErrorBoundary>
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
            
            <Route path="/pdfs" element={
              <ProtectedRoute>
                <Layout>
                  <PDFs />
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
    </ErrorBoundary>
  )
}

export default App