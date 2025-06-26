import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { chatWithTutor } from '../lib/gemini'
import { Send, Bot, User, Loader2, Sparkles, BookOpen, Target, MessageCircle, Clock, Zap, X, Trash2 } from 'lucide-react'

interface Message {
  id: string
  message: string
  response: string
  created_at: string
}

export function TutorBot() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [showTestModal, setShowTestModal] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  const quickActions = [
    {
      icon: BookOpen,
      text: "Explain a concept",
      prompt: "Can you explain the concept of "
    },
    {
      icon: Target,
      text: "Help with test prep",
      prompt: "I need help preparing for a test on "
    },
    {
      icon: Sparkles,
      text: "Generate practice questions",
      prompt: "Can you generate some practice questions for "
    },
    {
      icon: MessageCircle,
      text: "Review my performance",
      prompt: "Can you review my recent test performance and give me suggestions?"
    }
  ]

  useEffect(() => {
    loadChatHistory()
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadChatHistory = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20)

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || loading || !user) return

    const userMessage = newMessage.trim()
    setNewMessage('')
    setLoading(true)
    setIsTyping(true)

    // Add user message immediately
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      message: userMessage,
      response: '',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      // Get user context (recent test results, previous chats)
      const [testResults, recentChats] = await Promise.all([
        supabase
          .from('test_results')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      const context = {
        recent_tests: testResults.data,
        recent_chats: recentChats.data,
        user_id: user.id
      }

      // Get AI response
      const response = await chatWithTutor(userMessage, context)

      // Save to database
      const { data: savedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          message: userMessage,
          response,
          context
        })
        .select()
        .single()

      if (error) throw error

      // Replace temp message with saved message
      setMessages(prev => prev.map(msg => 
        msg.id === tempUserMessage.id ? savedMessage : msg
      ))
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove temp message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id))
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  const handleQuickAction = (prompt: string) => {
    setNewMessage(prompt)
  }

  const clearAllChat = async () => {
    if (!user) return
    
    setClearing(true)
    try {
      // Delete all chat messages from Supabase
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      // Clear messages from UI
      setMessages([])
      setShowClearConfirm(false)
    } catch (error) {
      console.error('Error clearing chat:', error)
      alert('Failed to clear chat. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col animate-fade-in">
      <div className="glass-card flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 glass rounded-full shadow-lg">
                <Bot className="h-6 w-6 text-black" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-black">AI TutorBot</h1>
                <div className="text-gray-500 flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                  Online • Ready to help
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {messages.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="glass-btn p-2 text-black"
                  title="Clear All Chat"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clear Chat Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Clear All Chat?</h3>
                <p className="text-slate-600 mb-6">
                  This will permanently delete all your chat messages. This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    disabled={clearing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={clearAllChat}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    disabled={clearing}
                  >
                    {clearing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      'Clear All'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-100 to-teal-100 rounded-full mb-6">
                <Bot className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Welcome to TutorBot!</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-8">
                I'm your personal AI learning assistant. Ask me anything about your studies, 
                get help with difficult concepts, or discuss your test results.
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all duration-200 text-left group"
                  >
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <action.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="ml-3 font-medium text-slate-700">{action.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="flex items-end max-w-[80%] space-x-2">
                    <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg">
                      <p className="text-sm">{msg.message}</p>
                    </div>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* Bot Response */}
                <div className="flex justify-start">
                  <div className="flex items-start max-w-[80%] space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-slate-50 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-200 shadow-sm">
                      <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{msg.response}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start max-w-[80%] space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-50 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-slate-500">TutorBot is typing...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <form onSubmit={sendMessage} className="flex space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask me anything about your studies..."
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-sm"
                disabled={loading}
              />
              {newMessage.trim() && (
                <button
                  type="button"
                  onClick={() => setNewMessage('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
          
          {/* Quick Actions for ongoing chat */}
          {messages.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.slice(0, 2).map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-slate-50 transition-colors flex items-center"
                >
                  <action.icon className="h-3 w-3 mr-1" />
                  {action.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}