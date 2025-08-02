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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">SumIT</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">SumIT</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform any content into intelligent insights. Upload PDFs, analyze websites, or process YouTube videos with AI-powered summarization.
          </p>
          
          <button
            onClick={testAPI}
            className="mt-4 px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Test API
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Content</h2>
              
              {/* PDF Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Upload PDF</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
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
                    className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                      isProcessing 
                        ? 'bg-gray-400 cursor-not-allowed text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isProcessing ? 'Processing...' : 'Choose File'}
                  </label>
                  <p className="mt-2 text-sm text-gray-500">PDF files only</p>
                </div>
              </div>

              {/* URL Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Website URL</label>
                <form onSubmit={handleUrlSubmit} className="space-y-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !url.trim()}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isProcessing || !url.trim()
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      'Process URL'
                    )}
                  </button>
                </form>
              </div>

              {/* YouTube Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">YouTube Video</label>
                <form onSubmit={handleYouTubeSubmit} className="space-y-3">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !youtubeUrl.trim()}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isProcessing || !youtubeUrl.trim()
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      'Process Video'
                    )}
                  </button>
                </form>
                <p className="mt-2 text-xs text-gray-500">
                  Video must have captions available
                </p>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                  {documents.length}
                </span>
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                  <p className="text-gray-500">Upload your first document to get started</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 flex-1">{doc.title}</h3>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-gray-400 hover:text-red-500 ml-2 p-1"
                          title="Delete document"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <p className="text-gray-600 mb-3 text-sm">{doc.summary}</p>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {doc.category}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          {doc.department}
                        </span>
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${
                          doc.type === 'pdf' 
                            ? 'bg-orange-100 text-orange-800' 
                            : doc.type === 'youtube'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-cyan-100 text-cyan-800'
                        }`}>
                          {doc.type.toUpperCase()}
                        </span>
                        {doc.originalUrl && (
                          <a
                            href={doc.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full hover:bg-purple-200 transition-colors"
                          >
                            View Original
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