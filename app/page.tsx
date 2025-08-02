'use client'

import { useState, useEffect } from 'react'
import AuthModal from '@/components/AuthModal'
import UsageIndicator from '@/components/UsageIndicator'
import { RateLimitService, DailyUsage } from '@/lib/rateLimitService'

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
  userId: string
}

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  lastLogin?: string
  emailVerified: boolean
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isClient, setIsClient] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [url, setUrl] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Auth states
  const [user, setUser] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [dailyUsage, setDailyUsage] = useState<DailyUsage | null>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      try {
        // Load user from localStorage (set by the new auth system)
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          const currentUser = JSON.parse(storedUser)
          setUser(currentUser)

          // Load user's documents
          const savedDocuments = localStorage.getItem(`documents_${currentUser.id}`)
          if (savedDocuments) {
            const parsed = JSON.parse(savedDocuments)
            setDocuments(parsed)
          }
          
          // Load usage
          const usage = RateLimitService.getDailyUsage(currentUser.id)
          setDailyUsage(usage)
        }
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
        if (savedTheme) {
          setTheme(savedTheme)
        } else {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          setTheme(prefersDark ? 'dark' : 'light')
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
  }, [isClient])

  const saveDocuments = (newDocuments: Document[]) => {
    if (isClient && user) {
      try {
        localStorage.setItem(`documents_${user.id}`, JSON.stringify(newDocuments))
      } catch (error) {
        console.error('Error saving documents:', error)
      }
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    if (isClient) {
      localStorage.setItem('theme', newTheme)
    }
  }

  const handleSignOut = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    // Clear local state
    localStorage.removeItem('user')
    setUser(null)
    setDocuments([])
    setDailyUsage(null)
  }

  const handleAuthSuccess = () => {
    // Get user from localStorage (set by AuthModal after successful login)
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const currentUser = JSON.parse(storedUser)
      setUser(currentUser)
      
      // Load user's documents
      const savedDocuments = localStorage.getItem(`documents_${currentUser.id}`)
      if (savedDocuments) {
        const parsed = JSON.parse(savedDocuments)
        setDocuments(parsed)
      }
      
      // Load usage
      const usage = RateLimitService.getDailyUsage(currentUser.id)
      setDailyUsage(usage)
    }
  }

  const checkRateLimit = (): boolean => {
    if (!user) {
      alert('Please sign in to use this feature')
      setShowAuthModal(true)
      return false
    }

    if (!RateLimitService.canMakeRequest(user.id)) {
      alert('You have reached your daily limit of 5 requests. Please try again tomorrow.')
      return false
    }

    return true
  }

  const incrementUsage = () => {
    if (user) {
      const newUsage = RateLimitService.incrementUsage(user.id)
      setDailyUsage(newUsage)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!checkRateLimit()) return

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

      // Add userId to the document
      result.userId = user!.id

      const newDocuments = [result, ...documents]
      setDocuments(newDocuments)
      saveDocuments(newDocuments)
      
      // Increment usage count
      incrementUsage()
      
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
    if (!checkRateLimit()) return

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
      result.userId = user!.id

      const newDocuments = [result, ...documents]
      setDocuments(newDocuments)
      saveDocuments(newDocuments)
      setUrl('')
      
      // Increment usage count
      incrementUsage()
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
    if (!checkRateLimit()) return

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
      result.userId = user!.id

      const newDocuments = [result, ...documents]
      setDocuments(newDocuments)
      saveDocuments(newDocuments)
      setYoutubeUrl('')
      
      // Increment usage count
      incrementUsage()
      
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
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>SumIT</h1>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-between items-center mb-8">
            {/* User info or sign in button */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user.name}
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className={`text-sm px-3 py-1 rounded-md transition-colors ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300 border border-gray-600 hover:bg-gray-800'
                        : 'text-gray-500 hover:text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>

            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>SumIT</h1>
            
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
          
          <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Transform any content into intelligent insights. Upload PDFs, analyze websites, or process YouTube videos with AI-powered summarization.
          </p>
          
          {!user && (
            <div className={`mt-4 p-4 rounded-lg ${
              theme === 'dark' 
                ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-800' 
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              <p className="text-sm">
                🔒 Please sign in to start processing documents. Free users get 5 requests per day.
              </p>
            </div>
          )}
          
          <button
            onClick={testAPI}
            className={`mt-4 px-3 py-1 text-sm rounded-md transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-gray-300 border border-gray-600 hover:bg-gray-800'
                : 'text-gray-500 hover:text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            Test API
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Usage Indicator */}
            {user && dailyUsage && (
              <UsageIndicator 
                userId={user.id} 
                theme={theme}
                onUsageUpdate={setDailyUsage}
              />
            )}

            <div className={`rounded-xl shadow-sm border p-6 ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Add Content</h2>
              
              {/* PDF Upload */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Upload PDF</label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  !user || (dailyUsage && dailyUsage.requests >= dailyUsage.maxRequests)
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                    ? 'border-gray-600 hover:border-gray-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing || !user || (dailyUsage && dailyUsage.requests >= dailyUsage.maxRequests)}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                      isProcessing || !user || (dailyUsage && dailyUsage.requests >= dailyUsage.maxRequests)
                        ? 'bg-gray-400 cursor-not-allowed text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isProcessing ? 'Processing...' : !user ? 'Sign In Required' : 'Choose File'}
                  </label>
                  <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {!user ? 'Sign in to upload PDFs' : 'PDF files only'}
                  </p>
                </div>
              </div>

              {/* URL Input */}
              <div className="mb-6">
                <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Website URL</label>
                <form onSubmit={handleUrlSubmit} className="space-y-3">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={!user ? "Sign in to process URLs" : "https://example.com/article"}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    disabled={isProcessing || !user}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !url.trim() || !user || (dailyUsage && dailyUsage.requests >= dailyUsage.maxRequests)}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isProcessing || !url.trim() || !user || (dailyUsage && dailyUsage.requests >= dailyUsage.maxRequests)
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : !user ? (
                      'Sign In Required'
                    ) : (
                      'Process URL'
                    )}
                  </button>
                </form>
              </div>

              {/* YouTube Input */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>YouTube Video</label>
                <form onSubmit={handleYouTubeSubmit} className="space-y-3">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder={!user ? "Sign in to process videos" : "https://www.youtube.com/watch?v=..."}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    disabled={isProcessing || !user}
                  />
                  <button
                    type="submit"
                    disabled={isProcessing || !youtubeUrl.trim() || !user || (dailyUsage && dailyUsage.requests >= dailyUsage.maxRequests)}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isProcessing || !youtubeUrl.trim() || !user || (dailyUsage && dailyUsage.requests >= dailyUsage.maxRequests)
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : !user ? (
                      'Sign In Required'
                    ) : (
                      'Process Video'
                    )}
                  </button>
                </form>
                <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {!user ? 'Sign in to process YouTube videos' : 'Video must have captions available'}
                </p>
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="lg:col-span-2">
            <div className={`rounded-xl shadow-sm border p-6 ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {user ? 'Your Documents' : 'Documents'}
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {documents.length}
                </span>
              </div>
              
              {!user ? (
                <div className="text-center py-12">
                  <svg className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Sign in to view documents</h3>
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Your processed documents will appear here after signing in</p>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Sign In Now
                  </button>
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12">
                  <svg className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No documents yet</h3>
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Upload your first document to get started</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        theme === 'dark'
                          ? 'border-gray-600 hover:bg-gray-700'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className={`font-semibold flex-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc.title}</h3>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className={`ml-2 p-1 transition-colors ${
                            theme === 'dark'
                              ? 'text-gray-500 hover:text-red-400'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                          title="Delete document"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <p className={`mb-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{doc.summary}</p>
                      
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        theme={theme}
      />
    </div>
  )
}