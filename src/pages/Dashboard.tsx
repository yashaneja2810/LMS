import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateRecommendations } from '../lib/gemini'
import { 
  BookOpen, 
  MessageCircle, 
  FileText, 
  TrendingUp, 
  Upload,
  Star,
  Clock,
  Trophy,
  Brain,
  Users,
  BarChart3
} from 'lucide-react'
import { Link } from 'react-router-dom'

// Animated count-up hook
function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = React.useState(0)
  React.useEffect(() => {
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    if (target === 0) {
      setValue(0)
      return
    }
    const interval = setInterval(() => {
      start += step
      if (start >= target) {
        setValue(target)
        clearInterval(interval)
      } else {
        setValue(start)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [target, duration])
  return value
}

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalTests: 0,
    averageScore: 0,
    totalMessages: 0,
    uploadedContent: 0
  })
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Animated count-up for stats
  const totalTests = useCountUp(stats.totalTests)
  const averageScore = useCountUp(stats.averageScore)
  const totalMessages = useCountUp(stats.totalMessages)
  const uploadedContent = useCountUp(stats.uploadedContent)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      // Load test stats
      const { data: testResults } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)

      // Load chat stats
      const { data: chatMessages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)

      // Load uploaded content stats
      const { data: uploadedContent } = await supabase
        .from('uploaded_content')
        .select('*')
        .eq('user_id', user.id)

      // Calculate stats
      const totalTests = testResults?.length || 0
      const averageScore = totalTests > 0 
        ? Math.round((testResults?.reduce((sum, test) => sum + (test.score / test.total_questions) * 100, 0) || 0) / totalTests)
        : 0

      setStats({
        totalTests,
        averageScore,
        totalMessages: chatMessages?.length || 0,
        uploadedContent: uploadedContent?.length || 0
      })

      // Load recommendations
      const userHistory = {
        tests: testResults,
        chats: chatMessages,
        content: uploadedContent
      }
      const recs = await generateRecommendations(userHistory)
      setRecommendations(recs)

      // Load recent activity
      const recent = [
        ...(testResults?.slice(-3).map(test => ({ 
          type: 'test', 
          title: test.test_title, 
          score: Math.round((test.score / test.total_questions) * 100),
          date: test.created_at 
        })) || []),
        ...(chatMessages?.slice(-3).map(chat => ({ 
          type: 'chat', 
          title: 'TutorBot Conversation', 
          message: chat.message.substring(0, 50) + '...',
          date: chat.created_at 
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

      setRecentActivity(recent)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="glass-card flex flex-col items-center text-center gap-2 mb-8 animate-fade-in relative overflow-hidden py-12">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-indigo-200 to-cyan-200 rounded-full blur-2xl opacity-30 animate-float" />
        <div className="z-10">
          <div className="text-2xl md:text-3xl font-semibold text-gray-500 mb-2 animate-fade-in">Welcome to</div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-black tracking-tight animate-slide-up">
            AIVerse LMS
          </h1>
        </div>
        <p className="text-lg text-gray-700 max-w-2xl mt-4 animate-fade-in z-10">
          Your personalized learning dashboard. Track your progress, get AI-powered recommendations, and access all your study tools in one place.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[{
          icon: <Trophy className="h-8 w-8 text-black" />, label: 'Total Tests', value: totalTests
        }, {
          icon: <Star className="h-8 w-8 text-black" />, label: 'Avg. Score', value: averageScore + '%'
        }, {
          icon: <MessageCircle className="h-8 w-8 text-black" />, label: 'TutorBot Chats', value: totalMessages
        }, {
          icon: <Upload className="h-8 w-8 text-black" />, label: 'Uploads', value: uploadedContent
        }].map((stat, idx) => (
          <div
            key={stat.label}
            className="glass-card flex flex-col items-center group animate-pop relative overflow-hidden hover:shadow-2xl hover:scale-[1.04] transition-all duration-300"
            style={{ animationDelay: `${0.1 * idx}s` }}
          >
            <div className="mb-2 p-4 glass rounded-full shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-transform duration-300">
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-black animate-countup">{stat.value}</div>
            <div className="text-gray-500 font-medium">{stat.label}</div>
            <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-gradient-to-br from-indigo-200 to-cyan-200 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-all duration-300" />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-card mb-8 animate-fade-in">
        <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-black" /> Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{
            to: '/tutor',
            icon: <MessageCircle className="h-8 w-8 text-black group-hover:animate-pulse" />,
            title: 'Ask TutorBot',
            desc: 'Get AI help'
          }, {
            to: '/tests',
            icon: <FileText className="h-8 w-8 text-black group-hover:animate-pulse" />,
            title: 'Take Test',
            desc: 'AI-generated'
          }, {
            to: '/upload',
            icon: <Upload className="h-8 w-8 text-black group-hover:animate-pulse" />,
            title: 'Upload Content',
            desc: 'Create tests'
          }, {
            to: '/study',
            icon: <BookOpen className="h-8 w-8 text-black group-hover:animate-pulse" />,
            title: 'Generate Study Material',
            desc: 'AI docs & videos'
          }].map((action, idx) => (
            <Link
              key={action.title}
              to={action.to}
              className="glass-card flex items-center group hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${0.1 * idx}s` }}
            >
              {action.icon}
              <div className="ml-3">
                <p className="text-black font-semibold text-lg">{action.title}</p>
                <p className="text-gray-500 text-sm">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="glass-card mb-8 animate-fade-in">
        <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
          <Brain className="h-6 w-6 text-black" /> AI Recommendations
        </h2>
        {recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div
                key={index}
                className="p-4 glass rounded-lg border border-gray-200 shadow-sm animate-pop"
                style={{ animationDelay: `${0.15 * index}s` }}
              >
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 text-black mr-1" />
                  <span className="text-gray-500 text-sm font-medium">AI Recommended</span>
                </div>
                <p className="text-black font-medium">{rec}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">No recommendations yet.</div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="glass-card animate-fade-in relative overflow-hidden">
        <div className="absolute left-0 top-6 bottom-6 w-1 bg-gradient-to-b from-indigo-200 to-cyan-200 rounded-full opacity-30" />
        <h2 className="text-xl font-bold text-black mb-4 flex items-center gap-2 z-10">
          <TrendingUp className="h-6 w-6 text-black" /> Recent Activity
        </h2>
        {recentActivity.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((item, idx) => (
              <li
                key={idx}
                className="py-4 flex items-center justify-between animate-slide-up"
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                <div>
                  <div className="font-semibold text-black">{item.title}</div>
                  {item.type === 'test' && (
                    <div className="text-gray-500 text-sm">Score: {item.score}%</div>
                  )}
                  {item.type === 'chat' && (
                    <div className="text-gray-500 text-sm">{item.message}</div>
                  )}
                </div>
                <div className="text-gray-400 text-xs">{new Date(item.date).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No recent activity.</div>
        )}
      </div>
    </div>
  )
}