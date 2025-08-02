'use client'

import { useState, useRef } from 'react'
import { Upload, Link, Loader2 } from 'lucide-react'
import type { Document } from '@/app/page'

interface DocumentUploadProps {
  onDocumentProcessed: (document: Document) => void
}

export default function DocumentUpload({ onDocumentProcessed }: DocumentUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [url, setUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process PDF')
      }

      const result = await response.json()
      onDocumentProcessed(result)
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert('Error processing PDF. Please try again.')
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

      if (!response.ok) {
        throw new Error('Failed to process URL')
      }

      const result = await response.json()
      onDocumentProcessed(result)
      setUrl('')
    } catch (error) {
      console.error('Error processing URL:', error)
      alert('Error processing URL. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Upload Document
      </h3>

      {/* PDF Upload */}
      <div
        className={`upload-area rounded-lg p-6 text-center mb-6 ${
          dragOver ? 'dragover' : ''
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
          }}
          className="hidden"
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-gray-600">Processing document...</p>
          </div>
        ) : (
          <div className="cursor-pointer">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF files only</p>
          </div>
        )}
      </div>

      {/* URL Input */}
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Or enter a URL
        </h4>
        <form onSubmit={handleUrlSubmit} className="space-y-3">
          <div className="flex">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/document"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isProcessing}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isProcessing || !url.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </div>
            ) : (
              'Process URL'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}