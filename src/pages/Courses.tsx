import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { generateRecommendations } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { BookOpen, Star, Clock, Users, Play, Brain } from 'lucide-react'

const sampleCourses = [
  {
    id: 1,
    title: 'Introduction to Machine Learning',
    description: 'Learn the fundamentals of ML algorithms and their applications',
    difficulty: 'Beginner',
    duration: '6 weeks',
    platform: 'Coursera',
    image: 'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=800',
    link: 'https://www.coursera.org/learn/machine-learning'
  },
  {
    id: 2,
    title: 'Advanced React Development',
    description: 'Master advanced React patterns and modern development practices',
    difficulty: 'Advanced',
    duration: '8 weeks',
    platform: 'freeCodeCamp',
    image: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg?auto=compress&cs=tinysrgb&w=800',
    link: 'https://www.freecodecamp.org/learn/front-end-development-libraries/react/'
  },
  {
    id: 3,
    title: 'Data Structures & Algorithms',
    description: 'Comprehensive guide to DSA for coding interviews and problem solving',
    difficulty: 'Intermediate',
    duration: '10 weeks',
    platform: 'GeeksforGeeks',
    image: 'https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?auto=compress&cs=tinysrgb&w=800',
    link: 'https://www.geeksforgeeks.org/data-structures/'
  },
  {
    id: 4,
    title: 'Python for Data Science',
    description: 'Learn Python programming with focus on data analysis and visualization',
    difficulty: 'Beginner',
    duration: '7 weeks',
    platform: 'Coursera',
    image: 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=800',
    link: 'https://www.coursera.org/specializations/data-science-python'
  },
  {
    id: 5,
    title: 'Full Stack Web Development',
    description: 'Complete web development bootcamp covering frontend and backend',
    difficulty: 'Intermediate',
    duration: '12 weeks',
    platform: 'freeCodeCamp',
    image: 'https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg?auto=compress&cs=tinysrgb&w=800',
    link: 'https://www.freecodecamp.org/learn/'
  },
  {
    id: 6,
    title: 'Database Design & SQL',
    description: 'Master database design principles and advanced SQL queries',
    difficulty: 'Intermediate',
    duration: '5 weeks',
    platform: 'GeeksforGeeks',
    image: 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=800',
    link: 'https://www.geeksforgeeks.org/dbms/'
  }
]

export function Courses() {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')

  useEffect(() => {
    loadRecommendations()
  }, [user])

  const loadRecommendations = async () => {
    if (!user) return

    try {
      // Get user history for recommendations
      const [testResults, chatMessages, uploadedContent] = await Promise.all([
        supabase.from('test_results').select('*').eq('user_id', user.id),
        supabase.from('chat_messages').select('*').eq('user_id', user.id),
        supabase.from('uploaded_content').select('*').eq('user_id', user.id)
      ])

      const userHistory = {
        tests: testResults.data,
        chats: chatMessages.data,
        content: uploadedContent.data
      }

      const recs = await generateRecommendations(userHistory)
      setRecommendations(recs)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = selectedDifficulty === 'All' 
    ? sampleCourses 
    : sampleCourses.filter(course => course.difficulty === selectedDifficulty)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700'
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700'
      case 'Advanced': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center gap-4 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-10 w-10 text-blue-500" />
          <h1 className="text-4xl font-extrabold text-blue-700 tracking-tight">Courses</h1>
        </div>
        <p className="text-lg text-slate-600 max-w-2xl">
          Explore curated courses and get AI-powered recommendations tailored to your learning journey.
        </p>
      </div>

      {/* AI Recommendations */}
      {!loading && recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-400" /> AI Recommended for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 3).map((rec, index) => (
              <div key={index} className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm">
                <div className="flex items-center mb-2">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-yellow-400 text-sm font-medium">AI Recommended</span>
                </div>
                <p className="text-blue-700 font-medium">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((difficulty) => (
            <button
              key={difficulty}
              onClick={() => setSelectedDifficulty(difficulty)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 border text-base shadow-sm ${
                selectedDifficulty === difficulty
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white border-blue-400'
                  : 'bg-white text-blue-700 border-blue-100 hover:bg-blue-50'
              }`}
            >
              {difficulty}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <div key={course.id} className="glass-card group flex flex-col overflow-hidden border border-gray-200 hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 animate-pop">
            <div className="relative h-48 overflow-hidden">
              <img 
                src={course.image} 
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-gray-300 to-gray-400 text-black shadow">
                  {course.difficulty}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-lg font-bold text-black mb-2 group-hover:text-gray-700 transition-colors">
                {course.title}
              </h3>
              <p className="text-gray-700 text-sm mb-4 line-clamp-2 flex-1">
                {course.description}
              </p>
              <div className="flex items-center text-gray-500 text-sm mb-4">
                <Clock className="h-4 w-4 mr-1" />
                {course.duration}
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-semibold bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
                  {course.platform}
                </span>
                <a
                  href={course.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-btn flex items-center"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Course
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-100 to-teal-100 rounded-2xl p-8 border border-blue-100 text-center mt-10">
        <BookOpen className="h-12 w-12 text-blue-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-blue-700 mb-2">Can't find what you're looking for?</h2>
        <p className="text-slate-600 mb-6">
          Upload your own study materials and let AI create personalized learning experiences for you
        </p>
        <button className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-teal-600 transition-all duration-200">
          Upload Content
        </button>
      </div>
    </div>
  )
}