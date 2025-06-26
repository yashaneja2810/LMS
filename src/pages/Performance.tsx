import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generatePerformanceInsights } from '../lib/gemini'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Brain, MessageCircle, Target, Clock, Award, Activity, BookOpen, ArrowRight, Star, Eye, X, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

// Predefined topics to match Tests page
const availableTopics = [
  'Gen AI',
  'ML',
  'Python',
  'React',
  'JavaScript',
  'Data Structures',
  'Algorithms',
  'Web Development',
  'Database',
  'Cloud Computing'
]

export function Performance() {
  const { user } = useAuth()
  const [testResults, setTestResults] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalTests: 0,
    averageScore: 0,
    bestScore: 0,
    worstScore: 0,
    improvement: 0,
    totalTime: 0,
    topicsCovered: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [topicDistribution, setTopicDistribution] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [showTestModal, setShowTestModal] = useState(false)
  const [recommendation, setRecommendation] = useState<{
    shouldRecommend: boolean;
    topic: string;
    reason: string;
  } | null>(null)
  const [topicData, setTopicData] = useState<Record<string, any[]>>({})

  useEffect(() => {
    loadPerformanceData()
  }, [user])

  const loadPerformanceData = async () => {
    if (!user) return

    try {
      const { data: results, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      setTestResults(results || [])

      if (results && results.length > 0) {
        // Calculate stats
        const scores = results.map(r => (r.score / r.total_questions) * 100)
        const totalTests = results.length
        const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalTests)
        const bestScore = Math.round(Math.max(...scores))
        const worstScore = Math.round(Math.min(...scores))
        const totalTime = results.reduce((sum, r) => sum + (r.time_taken || 0), 0)
        const topicsCovered = new Set(results.map(r => r.topic)).size
        
        // Calculate improvement (comparing first half to second half)
        const halfPoint = Math.floor(totalTests / 2)
        const firstHalf = scores.slice(0, halfPoint)
        const secondHalf = scores.slice(halfPoint)
        const improvement = secondHalf.length > 0 && firstHalf.length > 0 
          ? Math.round((secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length) - (firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length))
          : 0

        setStats({
          totalTests,
          averageScore,
          bestScore,
          worstScore,
          improvement,
          totalTime,
          topicsCovered
        })

        // Prepare chart data
        const chartData = results.map((result, index) => ({
          test: `Test ${index + 1}`,
          score: Math.round((result.score / result.total_questions) * 100),
          date: new Date(result.created_at).toLocaleDateString(),
          topic: result.topic
        }))
        setChartData(chartData)

        // Prepare topic distribution
        const topicCounts = results.reduce((acc, result) => {
          acc[result.topic] = (acc[result.topic] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const topicData = Object.entries(topicCounts).map(([topic, count]) => ({
          name: topic,
          value: count
        }))
        setTopicDistribution(topicData)

        // Group results by topic
        const groupedByTopic = results.reduce((acc, result) => {
          if (!acc[result.topic]) {
            acc[result.topic] = []
          }
          acc[result.topic].push({
            ...result,
            score: Math.round((result.score / result.total_questions) * 100)
          })
          return acc
        }, {} as Record<string, any[]>)
        setTopicData(groupedByTopic)

        // Analyze and generate recommendations
        await generateRecommendations(results, scores, averageScore)
      }
    } catch (error) {
      console.error('Error loading performance data:', error)
    }
  }

  const generateRecommendations = async (results: any[], scores: number[], averageScore: number) => {
    try {
      // Find the topic with the lowest performance
      const topicPerformance = results.reduce((acc, result) => {
        const score = (result.score / result.total_questions) * 100
        if (!acc[result.topic]) {
          acc[result.topic] = { total: 0, count: 0, scores: [] }
        }
        acc[result.topic].total += score
        acc[result.topic].count += 1
        acc[result.topic].scores.push(score)
        return acc
      }, {} as Record<string, { total: number; count: number; scores: number[] }>)

      // Find the worst performing topic
      let worstTopic = ''
      let worstAverage = 100
      for (const [topic, data] of Object.entries(topicPerformance)) {
        const average = data.total / data.count
        if (average < worstAverage) {
          worstAverage = average
          worstTopic = topic
        }
      }

      // Determine if we should recommend study material
      const shouldRecommend = averageScore < 70 || worstAverage < 60 || results.length < 3

      if (shouldRecommend) {
        const reason = averageScore < 70 
          ? `Your average score is ${averageScore}%. Let's improve your understanding.`
          : worstAverage < 60
          ? `You're struggling with ${worstTopic}. Let's strengthen this area.`
          : `You've taken ${results.length} tests. Let's explore more topics.`

        setRecommendation({
          shouldRecommend: true,
          topic: worstTopic || 'General Learning',
          reason
        })
      }
    } catch (error) {
      console.error('Error generating recommendations:', error)
    }
  }

  const handleGenerateStudyMaterial = () => {
    if (recommendation) {
      // Store the recommendation in localStorage for the Study Material page
      localStorage.setItem('autoGenerateTopic', recommendation.topic)
      localStorage.setItem('autoGenerateReason', recommendation.reason)
      // Redirect to study material page
      window.location.href = '/study'
    }
  }

  const handleGenerateStudyMaterialForTest = (test: any) => {
    const score = Math.round((test.score / test.total_questions) * 100)
    const reason = `You scored ${score}% on "${test.test_title}". Let's improve your understanding of ${test.topic}.`
    
    // Store the recommendation in localStorage for the Study Material page
    localStorage.setItem('autoGenerateTopic', test.topic)
    localStorage.setItem('autoGenerateReason', reason)
    // Redirect to study material page
    window.location.href = '/study'
  }

  const sendToTutor = async () => {
    window.location.href = '/tutor'
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  const openTestDetails = (test: any) => {
    setSelectedTest(test)
    setShowTestModal(true)
  }

  const closeTestModal = () => {
    setShowTestModal(false)
    setSelectedTest(null)
  }

  if (testResults.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full mb-4">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-blue-700 mb-2">Performance Tracker</h1>
          <p className="text-lg text-slate-600">Track your learning progress with AI insights</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-blue-100">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <TrendingUp className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">No Test Results Yet</h3>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Take some tests to start tracking your performance and get AI-powered insights to improve your learning
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-teal-600 transition-all duration-200 flex items-center justify-center">
              <Target className="h-5 w-5 mr-2" />
            Take Your First Test
          </button>
            <button className="bg-slate-100 text-slate-700 px-8 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-all duration-200 flex items-center justify-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Browse Study Material
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 glass mb-4">
          <Activity className="h-8 w-8 text-black" />
        </div>
        <h1 className="text-4xl font-extrabold text-black mb-2">Performance Dashboard</h1>
        <p className="text-lg text-gray-700">Track your learning progress with AI insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Tests Taken</p>
              <p className="text-3xl font-bold text-black">{stats.totalTests}</p>
            </div>
            <div className="p-3 glass rounded-xl">
              <Target className="h-6 w-6 text-black" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
              <span>Consistent progress</span>
            </div>
          </div>
        </div>
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Average Score</p>
              <p className="text-3xl font-bold text-black">{stats.averageScore}%</p>
            </div>
            <div className="p-3 glass rounded-xl">
              <TrendingUp className="h-6 w-6 text-black" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <Award className="h-4 w-4 mr-1 text-yellow-500" />
              <span>Great performance</span>
            </div>
          </div>
        </div>
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Best Score</p>
              <p className="text-3xl font-bold text-black">{stats.bestScore}%</p>
            </div>
            <div className="p-3 glass rounded-xl">
              <Award className="h-6 w-6 text-black" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <Star className="h-4 w-4 mr-1 text-yellow-500" />
              <span>Personal best</span>
            </div>
          </div>
        </div>
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Improvement</p>
              <p className={`text-3xl font-bold ${stats.improvement >= 0 ? 'text-green-700' : 'text-red-700'}`}>{stats.improvement >= 0 ? '+' : ''}{stats.improvement}%</p>
            </div>
            <div className={`p-3 glass rounded-xl ${stats.improvement >= 0 ? '' : ''}`}>{stats.improvement >= 0 ? <TrendingUp className="h-6 w-6 text-black" /> : <TrendingDown className="h-6 w-6 text-black" />}</div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <Activity className="h-4 w-4 mr-1 text-black" />
              <span>{stats.improvement >= 0 ? 'Getting better' : 'Keep practicing'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-8 animate-fade-in">
        {/* Topic Distribution */}
        <div className="glass-card">
          <h2 className="text-xl font-bold text-black mb-6 flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-black" />
            Topics Covered
          </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topicDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#818cf8"
                  dataKey="value"
                >
                  {topicDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Topic-Specific Performance */}
        {availableTopics.map((topic) => {
          const topicResults = topicData[topic] || []
          if (topicResults.length === 0) return null
          const topicScores = topicResults.map((result, index) => ({
            test: `${topic} Test ${index + 1}`,
            score: result.score,
            date: new Date(result.created_at).toLocaleDateString(),
            difficulty: result.difficulty
          }))
          const topicAverage = Math.round(topicScores.reduce((sum, r) => sum + r.score, 0) / topicScores.length)
          const topicBest = Math.max(...topicScores.map(r => r.score))
          const topicTests = topicResults.length
          return (
            <div key={topic} className="glass-card mb-8 animate-pop">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black flex items-center">
                  <Target className="h-5 w-5 mr-2 text-black" />
                  {topic} Performance
                </h2>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{topicAverage}%</div>
                    <div className="text-gray-500">Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{topicBest}%</div>
                    <div className="text-gray-500">Best</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">{topicTests}</div>
                    <div className="text-gray-500">Tests</div>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={topicScores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="test" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                        color: '#1e293b'
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                      stroke="#818cf8" 
                strokeWidth={3}
                      dot={{ fill: '#818cf8', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, fill: '#67e8f9' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
            </div>
          )
        })}
      </div>

      {/* Recent Tests */}
      <div className="glass-card animate-fade-in">
          <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-black flex items-center">
            <Activity className="h-5 w-5 mr-2 text-black" />
            Recent Tests
            </h2>
          <Link
            to="/tests"
            className="glass-btn"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
          <div className="space-y-4">
          {testResults.slice(-6).reverse().map((test, index) => {
              const score = Math.round((test.score / test.total_questions) * 100)
            const needsStudyMaterial = score < 70
              return (
              <div key={test.id} className="p-4 glass rounded-xl border border-gray-200 hover:shadow-xl transition-all duration-200 animate-pop">
                  <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-black font-semibold mb-1 truncate">{test.test_title}</h3>
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <span className="bg-gray-100 text-black px-2 py-1 rounded-full text-xs font-medium mr-2">
                        {test.topic}
                      </span>
                      <span>{new Date(test.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(test.time_taken || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`text-xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{score}%</div>
                      <div className="text-gray-500 text-xs">{test.score}/{test.total_questions}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openTestDetails(test)}
                        className="p-2 glass-btn text-black"
                        title="View detailed insights"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {needsStudyMaterial && (
                        <button
                          onClick={() => handleGenerateStudyMaterialForTest(test)}
                          className="p-2 glass-btn text-black"
                          title="Generate study material for this topic"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Individual test recommendation */}
                {needsStudyMaterial && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="bg-gradient-to-r from-indigo-100 to-cyan-100 rounded-lg p-3 border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-indigo-700">
                          <Target className="h-4 w-4 mr-2" />
                          <span>Score {score}% - Consider reviewing <strong>{test.topic}</strong></span>
                      </div>
                        <button
                          onClick={() => handleGenerateStudyMaterialForTest(test)}
                          className="glass-btn px-3 py-1 text-xs"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Study Material
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              )
            })}
          </div>
        {testResults.length > 6 && (
          <div className="mt-4 text-center">
            <Link
              to="/tests"
              className="glass-btn"
            >
              View All Tests
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        )}
      </div>

      {/* Test Details Modal */}
      {showTestModal && selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Test Details</h2>
                <button
                  onClick={closeTestModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Test Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <h3 className="text-lg font-semibold text-blue-700 mb-2">Score</h3>
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round((selectedTest.score / selectedTest.total_questions) * 100)}%
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedTest.score}/{selectedTest.total_questions} correct
                  </p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Time</h3>
                  <div className="text-3xl font-bold text-green-600">
                    {formatTime(selectedTest.time_taken || 0)}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Time taken
                  </p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <h3 className="text-lg font-semibold text-purple-700 mb-2">Topic</h3>
                  <div className="text-xl font-bold text-purple-600">
                    {selectedTest.topic}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedTest.difficulty} difficulty
                  </p>
                </div>
              </div>

              {/* AI Suggestions */}
              {selectedTest.suggestions && selectedTest.suggestions.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-blue-500" />
                    AI Suggestions
                  </h3>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <ul className="space-y-2">
                      {selectedTest.suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx} className="text-yellow-800 flex items-start">
                          <span className="text-yellow-600 mr-2 mt-1">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Detailed Results */}
              {selectedTest.detailed_results && selectedTest.detailed_results.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-500" />
                    Question Analysis
                  </h3>
                  <div className="space-y-4">
                    {selectedTest.detailed_results.map((result: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="text-lg font-semibold text-slate-800">Question {idx + 1}</h4>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            result.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {result.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        <p className="text-slate-700 mb-3">{result.question}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-medium text-slate-600">Your Answer:</span>
                            <p className="text-slate-800">{result.userAnswer}</p>
                          </div>
                          <div>
                            <span className="font-medium text-slate-600">Correct Answer:</span>
                            <p className="text-slate-800">{result.correctAnswer}</p>
                          </div>
                        </div>
                        {result.explanation && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium text-blue-700">Explanation:</span>
                            <p className="text-blue-800 mt-1">{result.explanation}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{formatTime(stats.totalTime)}</h3>
          <p className="text-slate-600">Total Study Time</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <BookOpen className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{stats.topicsCovered}</h3>
          <p className="text-slate-600">Topics Covered</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
            <Target className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-1">{Math.round(stats.totalTime / stats.totalTests / 60)}m</h3>
          <p className="text-slate-600">Avg. Time per Test</p>
        </div>
      </div>
    </div>
  )
}