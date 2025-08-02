'use client'

import { X, Calendar, Tag, Building, ExternalLink } from 'lucide-react'
import type { Document } from '@/app/page'

interface DocumentModalProps {
  document: Document
  onClose: () => void
}

export default function DocumentModal({ document, onClose }: DocumentModalProps) {
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Technical': 'bg-blue-100 text-blue-800',
      'Business': 'bg-green-100 text-green-800',
      'Legal': 'bg-red-100 text-red-800',
      'Marketing': 'bg-purple-100 text-purple-800',
      'HR': 'bg-yellow-100 text-yellow-800',
      'Finance': 'bg-indigo-100 text-indigo-800',
      'Operations': 'bg-gray-100 text-gray-800',
      'Research': 'bg-pink-100 text-pink-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getDepartmentColor = (department: string) => {
    const colors: { [key: string]: string } = {
      'Engineering': 'bg-blue-50 text-blue-700 border-blue-200',
      'Sales': 'bg-green-50 text-green-700 border-green-200',
      'Legal': 'bg-red-50 text-red-700 border-red-200',
      'Marketing': 'bg-purple-50 text-purple-700 border-purple-200',
      'HR': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Finance': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Operations': 'bg-gray-50 text-gray-700 border-gray-200',
      'Research': 'bg-pink-50 text-pink-700 border-pink-200',
    }
    return colors[department] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {document.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(document.uploadDate).toLocaleDateString()}
            </div>

            <div className="flex items-center">
              <Tag className="h-4 w-4 mr-1 text-gray-400" />
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                {document.category}
              </span>
            </div>

            <div className="flex items-center">
              <Building className="h-4 w-4 mr-1 text-gray-400" />
              <span className={`px-2 py-1 rounded border text-xs font-medium ${getDepartmentColor(document.department)}`}>
                {document.department}
              </span>
            </div>

            <span className={`px-2 py-1 rounded text-xs font-medium ${
              document.type === 'pdf' 
                ? 'bg-orange-100 text-orange-800' 
                : 'bg-cyan-100 text-cyan-800'
            }`}>
              {document.type.toUpperCase()}
            </span>

            {document.originalUrl && (
              <a
                href={document.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Original
              </a>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {document.summary}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Full Content
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {document.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}