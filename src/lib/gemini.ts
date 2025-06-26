const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  throw new Error('Missing Gemini API key')
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string
      }[]
    }
  }[]
}

export async function generateWithGemini(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data: GeminiResponse = await response.json()
    return data.candidates[0]?.content?.parts[0]?.text || 'No response generated'
  } catch (error) {
    console.error('Gemini API error:', error)
    throw error
  }
}

export async function generateTestQuestions(content: string): Promise<any> {
  const prompt = `Create 5 multiple choice questions and 2 short answer questions from the following content. Format as JSON:
  {
    "mcq": [
      {
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correct": 0,
        "explanation": "Why this is correct"
      }
    ],
    "short": [
      {
        "question": "Question text",
        "sample_answer": "Expected answer format"
      }
    ]
  }
  
  Content: ${content}`

  const response = await generateWithGemini(prompt)
  try {
    return JSON.parse(response)
  } catch {
    return { mcq: [], short: [] }
  }
}

export async function gradeAnswer(question: string, answer: string, type: 'mcq' | 'short'): Promise<{ score: number; feedback: string }> {
  const prompt = `Grade this ${type} answer and provide feedback:
  Question: ${question}
  Answer: ${answer}
  
  Respond in JSON format:
  {
    "score": (0-10),
    "feedback": "Detailed feedback explaining the score and areas for improvement"
  }`

  const response = await generateWithGemini(prompt)
  try {
    return JSON.parse(response)
  } catch {
    return { score: 0, feedback: 'Unable to grade this answer' }
  }
}

export async function generateRecommendations(userHistory: any): Promise<string[]> {
  const prompt = `Based on this user's learning history, recommend 5 relevant courses or topics:
  ${JSON.stringify(userHistory)}
  
  Return as JSON array of course titles: ["Course 1", "Course 2", ...]`

  const response = await generateWithGemini(prompt)
  try {
    return JSON.parse(response)
  } catch {
    return ['Introduction to Programming', 'Data Structures', 'Web Development', 'Machine Learning Basics', 'Database Design']
  }
}

export async function generatePerformanceInsights(testResults: any[]): Promise<string> {
  const prompt = `Analyze these test results and provide insights and recommendations:
  ${JSON.stringify(testResults)}
  
  Provide a detailed analysis focusing on:
  - Performance trends
  - Areas of strength
  - Areas needing improvement
  - Specific recommendations`

  return await generateWithGemini(prompt)
}

export async function chatWithTutor(message: string, context: any): Promise<string> {
  const prompt = `You are an AI tutor helping a student. Context: ${JSON.stringify(context)}
  
  Student question: ${message}
  
  Provide a helpful, educational response that:
  - Explains concepts clearly
  - Gives step-by-step guidance
  - Encourages learning
  - References their past performance when relevant`

  return await generateWithGemini(prompt)
}