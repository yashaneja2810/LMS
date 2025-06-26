import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateWithGemini } from '../lib/gemini'
import { FileText, Brain, Play, Clock, Target, BarChart3, CheckCircle, XCircle, Timer, AlertCircle } from 'lucide-react'

interface CustomTestConfig {
  topic: string
  timeLimit: number // in minutes
  numQuestions: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface TestQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  type: 'mcq'
}

interface TestResult {
  totalQuestions: number
  correctAnswers: number
  score: number
  timeTaken: number
  suggestions: string[]
  detailedResults: Array<{
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    explanation: string
  }>
}

export function Tests() {
  const { user } = useAuth()
  const [customTestConfig, setCustomTestConfig] = useState<CustomTestConfig>({
    topic: '',
    timeLimit: 30,
    numQuestions: 10,
    difficulty: 'medium'
  })
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
  const [testStartTime, setTestStartTime] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isTestActive, setIsTestActive] = useState(false)
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [generatingTest, setGeneratingTest] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  // Predefined topics
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

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTestActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTestSubmission()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTestActive, timeRemaining])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const generateCustomTest = async () => {
    if (!customTestConfig.topic.trim()) return
    
    setGeneratingTest(true)
    try {
      const prompt = `Create ${customTestConfig.numQuestions} multiple choice questions about "${customTestConfig.topic}" with ${customTestConfig.difficulty} difficulty level. Each question should have 4 options (A, B, C, D) and include a detailed explanation for the correct answer.

Format the response as a JSON array:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this is correct"
  }
]

Make sure the questions are challenging but appropriate for ${customTestConfig.difficulty} level.`

      const response = await generateWithGemini(prompt)
      let questions: TestQuestion[] = []
      
      try {
        let cleaned = response.replace(/```json[\s\S]*?\n|```/g, '').trim()
        // Remove trailing commas before ] or }
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
        // Remove any leading or trailing non-json text
        const firstBracket = cleaned.indexOf('[')
        const lastBracket = cleaned.lastIndexOf(']')
        if (firstBracket !== -1 && lastBracket !== -1) {
          cleaned = cleaned.substring(firstBracket, lastBracket + 1)
        }
        questions = JSON.parse(cleaned)
      } catch (error) {
        console.error('Failed to parse test questions:', error)
        alert('Sorry, there was an error generating the test questions. Please try again!')
        setGeneratingTest(false)
        return
      }

      setTestQuestions(questions)
      setUserAnswers({})
      setCurrentQuestionIndex(0)
      setTimeRemaining(customTestConfig.timeLimit * 60)
      setIsTestActive(true)
      setTestStartTime(new Date())
      setIsTestComplete(false)
      setTestResult(null)
    } catch (error) {
      console.error('Failed to generate test:', error)
    } finally {
      setGeneratingTest(false)
    }
  }

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }))
  }

  const handleTestSubmission = async () => {
    if (!testStartTime || !user) return
    
    setEvaluating(true)
    setIsTestActive(false)
    
    try {
      const timeTaken = Math.floor((Date.now() - testStartTime.getTime()) / 1000)
      
      // Prepare answers for Gemini evaluation
      const answersForEvaluation = testQuestions.map((q, idx) => ({
        question: q.question,
        userAnswer: userAnswers[idx] !== undefined ? q.options[userAnswers[idx]] : 'Not answered',
        correctAnswer: q.options[q.correctAnswer],
        options: q.options
      }))

      const evaluationPrompt = `Evaluate this test on "${customTestConfig.topic}" with ${customTestConfig.difficulty} difficulty level.

Test Details:
- Total Questions: ${testQuestions.length}
- Time Limit: ${customTestConfig.timeLimit} minutes
- Time Taken: ${Math.floor(timeTaken / 60)} minutes ${timeTaken % 60} seconds

Student Answers:
${answersForEvaluation.map((a, idx) => `${idx + 1}. Question: ${a.question}
   Student Answer: ${a.userAnswer}
   Correct Answer: ${a.correctAnswer}
   Options: ${a.options.join(', ')}`).join('\n\n')}

Provide a detailed evaluation in JSON format:
{
  "totalQuestions": ${testQuestions.length},
  "correctAnswers": <number of correct answers>,
  "score": <percentage score>,
  "timeTaken": ${timeTaken},
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "detailedResults": [
    {
      "question": "question text",
      "userAnswer": "student's answer",
      "correctAnswer": "correct answer",
      "isCorrect": true/false,
      "explanation": "why this is correct/incorrect"
    }
  ]
}`

      const evaluationResponse = await generateWithGemini(evaluationPrompt)
      let result: TestResult
      
      try {
        const cleaned = evaluationResponse.replace(/```json\n?|\n?```/g, '').trim()
        result = JSON.parse(cleaned)
      } catch (error) {
        // Fallback calculation if Gemini parsing fails
        const correctAnswers = answersForEvaluation.filter(a => 
          a.userAnswer === a.correctAnswer
        ).length
        result = {
          totalQuestions: testQuestions.length,
          correctAnswers,
          score: Math.round((correctAnswers / testQuestions.length) * 100),
          timeTaken,
          suggestions: ['Review the topics you found challenging', 'Practice more questions', 'Focus on time management'],
          detailedResults: answersForEvaluation.map(a => ({
            question: a.question,
            userAnswer: a.userAnswer,
            correctAnswer: a.correctAnswer,
            isCorrect: a.userAnswer === a.correctAnswer,
            explanation: a.userAnswer === a.correctAnswer ? 'Correct answer!' : 'Incorrect answer'
          }))
        }
      }

      setTestResult(result)
      setIsTestComplete(true)

      // Save to Supabase
      await supabase.from('test_results').insert({
        user_id: user.id,
        test_title: `Custom Test: ${customTestConfig.topic}`,
        topic: customTestConfig.topic,
        difficulty: customTestConfig.difficulty,
        total_questions: result.totalQuestions,
        score: result.correctAnswers,
        percentage: result.score,
        time_taken: result.timeTaken,
        time_limit: customTestConfig.timeLimit * 60,
        suggestions: result.suggestions,
        detailed_results: result.detailedResults,
        created_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Failed to evaluate test:', error)
    } finally {
      setEvaluating(false)
    }
  }

  const resetTest = () => {
    setTestQuestions([])
    setUserAnswers({})
    setCurrentQuestionIndex(0)
    setTimeRemaining(0)
    setIsTestActive(false)
    setIsTestComplete(false)
    setTestResult(null)
    setTestStartTime(null)
  }

  if (evaluating) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-blue-700 mb-2">Evaluating Your Test</h2>
          <p className="text-slate-600">AI is analyzing your answers and generating detailed feedback...</p>
        </div>
      </div>
    )
  }

  if (isTestComplete && testResult) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              testResult.score >= 70 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {testResult.score >= 70 ? 
                <CheckCircle className="h-8 w-8 text-green-600" /> : 
                <XCircle className="h-8 w-8 text-red-600" />
              }
            </div>
            <h1 className="text-3xl font-bold text-blue-700 mb-2">Test Results</h1>
            <p className="text-slate-600">
              Topic: {customTestConfig.topic} | Difficulty: {customTestConfig.difficulty}
            </p>
          </div>

          {/* Score Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-blue-700">{testResult.score}%</div>
              <div className="text-slate-600">Score</div>
            </div>
            <div className="bg-green-50 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-green-700">{testResult.correctAnswers}/{testResult.totalQuestions}</div>
              <div className="text-slate-600">Correct Answers</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-purple-700">{formatTime(testResult.timeTaken)}</div>
              <div className="text-slate-600">Time Taken</div>
            </div>
          </div>

          {/* Suggestions */}
          {testResult.suggestions.length > 0 && (
            <div className="bg-yellow-50 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold text-yellow-800 mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                AI Suggestions
              </h3>
              <ul className="space-y-2">
                {testResult.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-yellow-700 flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Results */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-blue-700">Detailed Results</h3>
            {testResult.detailedResults.map((result, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-semibold text-slate-800">Question {idx + 1}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                    {result.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                <p className="text-slate-700 mb-3">{result.question}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-700">Explanation:</span>
                    <p className="text-blue-800 mt-1">{result.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={resetTest}
              className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-teal-600 transition-all duration-200"
            >
              Take Another Test
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isTestActive && testQuestions.length > 0) {
    const currentQuestion = testQuestions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / testQuestions.length) * 100

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header with Timer */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-blue-700">Test: {customTestConfig.topic}</h1>
              <p className="text-slate-600">Question {currentQuestionIndex + 1} of {testQuestions.length}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center text-lg font-bold text-red-600">
                <Timer className="h-5 w-5 mr-2" />
                {formatTime(timeRemaining)}
              </div>
              <div className="text-slate-500 text-sm">Time Remaining</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
              ></div>
            </div>

          {/* Question */}
          <div className="bg-slate-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">{currentQuestion.question}</h2>

                <div className="space-y-3">
              {currentQuestion.options.map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                  onClick={() => handleAnswer(currentQuestionIndex, optionIndex)}
                      className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${
                    userAnswers[currentQuestionIndex] === optionIndex
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-medium mr-3">{String.fromCharCode(65 + optionIndex)}.</span>
                      {option}
                    </button>
                  ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex gap-2">
              {currentQuestionIndex < testQuestions.length - 1 ? (
              <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all"
              >
                  Next
              </button>
            ) : (
              <button
                  onClick={handleTestSubmission}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all"
              >
                  Submit Test
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-black mb-2">Custom Test Generator</h1>
        <p className="text-gray-700">Create personalized tests with AI-generated questions</p>
      </div>

      {/* Custom Test Configuration */}
      <div className="glass-card mb-8 animate-slide-up">
        <h2 className="text-2xl font-bold text-black mb-6 flex items-center">
          <Target className="h-6 w-6 mr-2 text-black" />
          Test Configuration
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
            <select
              value={customTestConfig.topic}
              onChange={(e) => setCustomTestConfig(prev => ({ ...prev, topic: e.target.value }))}
              className="glass w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
            >
              <option value="">Select a topic</option>
              {availableTopics.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
            <select
              value={customTestConfig.difficulty}
              onChange={(e) => setCustomTestConfig(prev => ({ ...prev, difficulty: e.target.value as any }))}
              className="glass w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
        </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Questions</label>
            <select
              value={customTestConfig.numQuestions}
              onChange={(e) => setCustomTestConfig(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
              className="glass w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
            >
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
                  </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Limit (minutes)</label>
            <select
              value={customTestConfig.timeLimit}
              onChange={(e) => setCustomTestConfig(prev => ({ ...prev, timeLimit: parseInt(e.target.value) }))}
              className="glass w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
                </div>
              </div>
        <div className="mt-8 flex justify-center">
              <button
            onClick={generateCustomTest}
            disabled={generatingTest || !customTestConfig.topic.trim()}
            className="glass-btn flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingTest ? (
              <>
                <Brain className="h-5 w-5 mr-2 animate-spin" />
                Generating Test...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                Start Test
                  </>
                )}
              </button>
            </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="p-3 bg-blue-100 rounded-full w-fit mb-4">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-blue-700 mb-2">AI-Generated Questions</h3>
          <p className="text-slate-600">Questions tailored to your topic and difficulty level</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="p-3 bg-green-100 rounded-full w-fit mb-4">
            <Timer className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-700 mb-2">Timed Tests</h3>
          <p className="text-slate-600">Set custom time limits with automatic submission</p>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="p-3 bg-purple-100 rounded-full w-fit mb-4">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-purple-700 mb-2">Detailed Analysis</h3>
          <p className="text-slate-600">Get AI-powered feedback and improvement suggestions</p>
        </div>
      </div>
    </div>
  )
}