'use client'

import { useState } from 'react'
import { Calendar, Tag, Building, ExternalLink, Trash2, Eye } from 'lucide-react'
import type { Document } from '@/app/page'
import DocumentModal from './DocumentModal'

interface DocumentListProps {
  documents: Document[]
  onDeleteDocument: (id: string) => void
}

export default function DocumentList({ documents, onDeleteDocument }: DocumentListProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

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
    <>
      <div className="space-y-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="document-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-4">
                {doc.title}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedDocument(doc)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {doc.originalUrl && (
                  <a
                    href={doc.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Open original URL"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-600 mb-4 overflow-hidden max-h-20">
              {doc.summary}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(doc.uploadDate).toLocaleDateString()}
              </div>

              <div className="flex items-center">
                <Tag className="h-4 w-4 mr-1 text-gray-400" />
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                  {doc.category}
                </span>
              </div>

              <div className="flex items-center">
                <Building className="h-4 w-4 mr-1 text-gray-400" />
                <span className={`px-2 py-1 rounded border text-xs font-medium ${getDepartmentColor(doc.department)}`}>
                  {doc.department}
                </span>
              </div>

              <span className={`px-2 py-1 rounded text-xs font-medium ${
                doc.type === 'pdf' 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-cyan-100 text-cyan-800'
              }`}>
                {doc.type.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedDocument && (
        <DocumentModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </>
  )
}