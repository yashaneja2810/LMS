import React, { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Upload as UploadIcon, FileText, File, Check } from 'lucide-react'

export function Upload() {
  const { user } = useAuth()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    if (!user || files.length === 0) return

    setUploading(true)
    const newUploads: any[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        const content = await readFileContent(file)
        const title = file.name.replace(/\.[^/.]+$/, '') // Remove extension
        
        const { data, error } = await supabase
          .from('uploaded_content')
          .insert({
            user_id: user.id,
            title,
            content,
            file_type: file.type || 'text/plain'
          })
          .select()
          .single()

        if (error) throw error

        newUploads.push(data)
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
      }
    }

    setUploadedFiles(prev => [...newUploads, ...prev])
    setUploading(false)
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const content = e.target?.result as string
        resolve(content)
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file)
      } else {
        // For other file types, we'll just store the filename and type
        resolve(`File: ${file.name} (${file.type || 'unknown type'})`)
      }
    })
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-2">Upload Learning Content</h1>
        <p className="text-slate-700">Upload your study materials to generate AI-powered tests and get personalized help</p>
      </div>

      {/* Upload Area */}
      <div
        className={`relative bg-white/10 backdrop-blur-lg rounded-xl border-2 border-dashed transition-all duration-200 ${
          dragActive 
            ? 'border-blue-400 bg-blue-500/20' 
            : 'border-white/30 hover:border-white/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.doc,.docx"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div className="p-4 bg-gradient-to-r from-blue-400 to-teal-400 rounded-full mb-6">
            <UploadIcon className="h-12 w-12 text-white" />
          </div>
          
          <h3 className="text-xl font-bold text-blue-700 mb-2">
            {uploading ? 'Uploading...' : 'Drop your files here'}
          </h3>
          
          <p className="text-slate-700 text-center mb-4">
            {uploading 
              ? 'Please wait while we process your files'
              : 'or click to browse and select files'
            }
          </p>
          
          <div className="text-slate-500 text-sm text-center">
            <p>Supported formats: TXT, MD, PDF, DOC, DOCX</p>
            <p>Maximum file size: 10MB per file</p>
          </div>

          {uploading && (
            <div className="mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {uploadedFiles.length > 0 && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-700">
              Successfully uploaded {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}!
            </p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-blue-700 mb-4">What happens after upload?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="p-3 bg-blue-500/20 rounded-full w-fit mx-auto mb-3">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-blue-700 font-medium mb-2">Content Analysis</h3>
            <p className="text-slate-700 text-sm">AI analyzes your content to understand key concepts and topics</p>
          </div>
          
          <div className="text-center">
            <div className="p-3 bg-green-500/20 rounded-full w-fit mx-auto mb-3">
              <FileText className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="text-green-700 font-medium mb-2">Test Generation</h3>
            <p className="text-slate-700 text-sm">Generate personalized tests with MCQs and short answer questions</p>
          </div>
          
          <div className="text-center">
            <div className="p-3 bg-purple-500/20 rounded-full w-fit mx-auto mb-3">
              <FileText className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-purple-700 font-medium mb-2">AI Tutoring</h3>
            <p className="text-slate-700 text-sm">TutorBot can reference your content to provide detailed explanations</p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-blue-700 mb-4">Tips for better results</h2>
        <ul className="space-y-2 text-slate-700">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            Upload well-structured content with clear headings and sections
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            Include key concepts, definitions, and examples in your materials
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            Text files (.txt, .md) work best for content analysis
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            Upload multiple files on related topics for comprehensive testing
          </li>
        </ul>
      </div>
    </div>
  )
}