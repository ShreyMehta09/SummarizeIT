import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('PDF processing endpoint hit')
    
    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    console.log('File received:', file.name, 'Type:', file.type, 'Size:', file.size)

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Import pdf-parse dynamically
    let pdf
    try {
      pdf = (await import('pdf-parse')).default
    } catch (importError) {
      console.error('Failed to import pdf-parse:', importError)
      return NextResponse.json(
        { error: 'PDF processing library not available' },
        { status: 500 }
      )
    }

    // Convert file to buffer
    console.log('Converting file to buffer...')
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Extract text from PDF with focus on text content, ignoring images
    console.log('Extracting text from PDF (ignoring images)...')
    let pdfData
    try {
      // Configure pdf-parse options to optimize for text extraction
      const options = {
        // Custom render function to extract only text, ignore images
        render_page: (pageData: any) => {
          // This function processes each page and extracts only text
          return pageData.getTextContent().then((textContent: any) => {
            let text = ''
            textContent.items.forEach((item: any) => {
              if (item.str && typeof item.str === 'string') {
                text += item.str + ' '
              }
            })
            return text
          }).catch(() => {
            // Fallback to default text extraction if custom method fails
            return ''
          })
        }
      }
      
      // Try with custom options first
      try {
        pdfData = await pdf(buffer, options)
      } catch (customError) {
        console.log('Custom extraction failed, trying default method...')
        // Fallback to default extraction
        pdfData = await pdf(buffer)
      }
    } catch (pdfError) {
      console.error('PDF parsing error:', pdfError)
      return NextResponse.json(
        { error: 'Failed to parse PDF. The file might be corrupted, password-protected, or contain only images.' },
        { status: 400 }
      )
    }

    let content = pdfData.text
    console.log('Raw extracted content length:', content?.length || 0)

    // Clean and process the extracted text, removing image artifacts
    if (content) {
      // Clean up the text content
      content = content
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove empty lines
        .replace(/\n\s*\n/g, '\n')
        // Remove common image-related artifacts and non-text elements
        .replace(/\[image\]/gi, '')
        .replace(/\[img\]/gi, '')
        .replace(/\[figure\]/gi, '')
        .replace(/\[chart\]/gi, '')
        .replace(/\[graph\]/gi, '')
        .replace(/\[photo\]/gi, '')
        .replace(/\[picture\]/gi, '')
        // Remove sequences of special characters that might be image artifacts
        .replace(/[^\w\s\.\,\!\?\;\:\-\(\)\[\]\"\']/g, ' ')
        // Clean up multiple spaces again
        .replace(/\s+/g, ' ')
        .trim()
      
      console.log('Cleaned content length:', content.length)
      
      // Log a sample of the content for debugging
      console.log('Content sample (first 200 chars):', content.substring(0, 200))
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract readable text from PDF. This PDF appears to contain only images, scanned content, or graphics. Please try a PDF with selectable text content.' },
        { status: 400 }
      )
    }

    // Check if we have meaningful content (not just random characters or artifacts)
    const words = content.split(/\s+/)
    const meaningfulWords = words.filter(word => 
      word.length > 2 && 
      /[a-zA-Z]/.test(word) &&
      !/^[^a-zA-Z]*$/.test(word) // Exclude words with no letters
    )

    console.log('Total words:', words.length, 'Meaningful words:', meaningfulWords.length)

    if (meaningfulWords.length < 10) {
      return NextResponse.json(
        { error: 'PDF contains insufficient readable text content. This appears to be an image-based, scanned, or graphics-heavy PDF. Please try a PDF with more selectable text content.' },
        { status: 400 }
      )
    }

    // If content is very long, truncate it for processing but keep a good sample
    if (content.length > 8000) {
      // Take the first 4000 and last 2000 characters to get a good representation
      const firstPart = content.substring(0, 4000)
      const lastPart = content.substring(content.length - 2000)
      content = firstPart + '\n\n[... content truncated for processing ...]\n\n' + lastPart
      console.log('Content truncated for processing, new length:', content.length)
    }

    // Get title from filename (remove extension)
    const title = file.name.replace(/\.pdf$/i, '')
    console.log('Processing document with title:', title)

    // Try to import and use Groq functionality
    let analysis
    try {
      const { summarizeAndCategorize } = await import('@/lib/groq')
      console.log('Starting AI analysis...')
      
      // Add instruction to focus on text content and ignore image references
      const enhancedContent = `Text content extracted from PDF (images and graphics ignored): ${content}`
      analysis = await summarizeAndCategorize(enhancedContent, title)
      console.log('AI analysis completed:', analysis)
    } catch (groqError) {
      console.error('Groq analysis error:', groqError)
      // Fallback to basic analysis
      const wordCount = meaningfulWords.length
      const estimatedReadingTime = Math.ceil(wordCount / 200) // Assuming 200 words per minute
      
      analysis = {
        summary: `Document "${title}" contains ${wordCount} meaningful words of text content (images and graphics were ignored during processing). Estimated reading time: ${estimatedReadingTime} minute(s). The document appears to contain ${content.includes('table') ? 'tables, ' : ''}${content.includes('figure') || content.includes('chart') ? 'figures/charts, ' : ''}and textual information.`,
        category: 'Technical',
        department: 'Operations'
      }
    }

    // Generate ID
    const generateId = () => Math.random().toString(36).substr(2, 9)

    // Create document object
    const document = {
      id: generateId(),
      title,
      summary: analysis.summary,
      category: analysis.category,
      department: analysis.department,
      uploadDate: new Date().toISOString(),
      type: 'pdf' as const,
      content: content.substring(0, 10000), // Limit content length for storage
    }

    console.log('Document created successfully:', document.id)
    console.log('Final summary:', analysis.summary)
    
    return NextResponse.json(document)
  } catch (error) {
    console.error('Unexpected error in PDF processing:', error)
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred while processing the PDF. Please ensure the PDF contains readable text content.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}