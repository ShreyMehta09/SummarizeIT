'use client'

import { useState, useEffect } from 'react'

export interface Document {
  id: string
  title: string
  summary: string
  category: string
  department: string
  uploadDate: string
  type: 'pdf' | 'url' | 'youtube'
  originalUrl?: string
  content: string
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isClient, setIsClient] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [url, setUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      try {
        const savedDocuments = localStorage.getItem('documents')
        if (savedDocuments) {
          const parsed = JSON.parse(savedDocuments)
          setDocuments(parsed)
        }
      } catch (error) {
        console.error('Error loading documents:', error)
      }
    }
  }, [isClient])

  const saveDocuments = (newDocuments: Document[]) => {
    if (isClient) {
      try {
        localStorage.setItem('documents', JSON.stringify(newDocuments))
      } catch (error) {
        console.error('Error saving documents:', error)
      }
    }
  }

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    setIsProcessing(true)
    try {
      console.log('Starting file upload for:', file.name)
      
      const formData = new FormData()
      formData.append('file', file)

      console.log('Sending request to /api/process-pdf')
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)
      console.log('Response content-type:', response.headers.get('content-type'))

      const responseText = await response.text()
      console.log('Raw response (first 200 chars):', responseText.substring(0, 200))

      if (!response.ok) {
        let errorMessage = 'Failed to process PDF'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          console.error('Failed to parse error response as JSON:', parseError)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
          if (responseText.includes('<!DOCTYPE')) {
            errorMessage = 'Server returned HTML instead of JSON. Check server logs for errors.'
          }
        }
        throw new Error(errorMessage)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse success response as JSON:', parseError)
        throw new Error('Invalid response format from server')
      }

      const newDocuments = [result, ...documents]
      setDocuments(newDocuments)
      saveDocuments(newDocuments)
      
      console.log('Document processed successfully:', result.id)
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert(`Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/process-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const responseText = await response.text()

      if (!response.ok) {
        let errorMessage = 'Failed to process URL'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = JSON.parse(responseText)
      const newDocuments = [result, ...documents]
      setDocuments(newDocuments)
      saveDocuments(newDocuments)
      setUrl('')
    } catch (error) {
      console.error('Error processing URL:', error)
      alert(`Error processing URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!youtubeUrl.trim()) return

    setIsProcessing(true)
    try {
      console.log('Processing YouTube URL:', youtubeUrl)
      
      const response = await fetch('/api/process-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      })

      const responseText = await response.text()
      console.log('YouTube API response status:', response.status)

      if (!response.ok) {
        let errorMessage = 'Failed to process YouTube video'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
          if (errorData.suggestion) {
            errorMessage += `\n\nSuggestion: ${errorData.suggestion}`
          }
        } catch (parseError) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = JSON.parse(responseText)
      const newDocuments = [result, ...documents]
      setDocuments(newDocuments)
      saveDocuments(newDocuments)
      setYoutubeUrl('')
      
      console.log('YouTube video processed successfully:', result.title)
    } catch (error) {
      console.error('Error processing YouTube video:', error)
      alert(`Error processing YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteDocument = (id: string) => {
    const newDocuments = documents.filter(doc => doc.id !== id)
    setDocuments(newDocuments)
    saveDocuments(newDocuments)
  }

  const testAPI = async () => {
    try {
      const response = await fetch('/api/test')
      const data = await response.json()
      alert(`API Test: ${data.message}`)
    } catch (error) {
      alert(`API Test Failed: ${error}`)
    }
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Document Summarizer & Categorizer
          </h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            📄 Document Summarizer & Categorizer
          </h1>
          <p className="text-gray-600 mb-4">
            Upload PDFs, enter URLs, or process YouTube videos to automatically extract, summarize, and categorize content using AI
          </p>
          
          {/* Debug button */}
          <button
            onClick={testAPI}
            className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
          >
            Test API Connection
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Add Content</h2>
              
              {/* PDF Upload */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">📄 Upload PDF</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-md transition-colors ${
                      isProcessing 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {isProcessing ? 'Processing...' : '📄 Choose PDF File'}
                  </label>
                  <p className="mt-2 text-sm text-gray-500">
                    Click to select a PDF file to upload
                  </p>
                </div>
              </div>

              {/* URL Input */}
              <div className="mb-6 border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">🔗 Process Website URL</h3>
                <form onSubmit={handleUrlSubmit} className="space-y-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !url.trim()}
                    className={`w-full py-2 px-4 rounded-md transition-colors ${
                      isProcessing || !url.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white`}
                  >
                    {isProcessing ? 'Processing...' : '🔗 Process URL'}
                  </button>
                </form>
              </div>

              {/* YouTube Input */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">🎥 Process YouTube Video</h3>
                <form onSubmit={handleYouTubeSubmit} className="space-y-3">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !youtubeUrl.trim()}
                    className={`w-full py-2 px-4 rounded-md transition-colors ${
                      isProcessing || !youtubeUrl.trim()
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    } text-white`}
                  >
                    {isProcessing ? 'Processing...' : '🎥 Process YouTube Video'}
                  </button>
                </form>
                <p className="mt-2 text-xs text-gray-500">
                  Note: Video must have captions/subtitles available
                </p>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">
                Documents ({documents.length})
              </h2>
              
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No documents yet
                  </h3>
                  <p className="text-gray-500">
                    Upload a PDF, enter a URL, or process a YouTube video to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 flex-1">
                          {doc.title}
                        </h3>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                          title="Delete document"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{doc.summary}</p>
                      
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          📂 {doc.category}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          🏢 {doc.department}
                        </span>
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          📅 {new Date(doc.uploadDate).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          doc.type === 'pdf' 
                            ? 'bg-orange-100 text-orange-800' 
                            : doc.type === 'youtube'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          {doc.type === 'pdf' ? '📄 PDF' : doc.type === 'youtube' ? '🎥 YouTube' : '🔗 URL'}
                        </span>
                        {doc.originalUrl && (
                          <a
                            href={doc.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
                          >
                            🔗 View Original
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}