import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Simple YouTube processing endpoint hit')
    
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'No YouTube URL provided' },
        { status: 400 }
      )
    }

    console.log('YouTube URL received:', url)

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)/
    if (!youtubeRegex.test(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL. Please provide a valid YouTube video link.' },
        { status: 400 }
      )
    }

    // Extract video ID from URL
    let videoId = ''
    try {
      const urlObj = new URL(url)
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1)
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || ''
        if (!videoId && urlObj.pathname.includes('/embed/')) {
          videoId = urlObj.pathname.split('/embed/')[1]
        }
      }
      
      videoId = videoId.split('&')[0].split('?')[0]
    } catch (error) {
      console.error('Error parsing YouTube URL:', error)
      return NextResponse.json(
        { error: 'Failed to parse YouTube URL' },
        { status: 400 }
      )
    }

    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID from YouTube URL' },
        { status: 400 }
      )
    }

    console.log('Extracted video ID:', videoId)

    // Simple method: Get video info via page scraping
    let videoTitle = ''
    let videoDescription = ''
    let content = ''

    try {
      console.log('Fetching YouTube page...')
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      console.log('Page fetched, length:', html.length)
      
      // Extract title
      const titleMatches = [
        html.match(/<title>([^<]+)<\/title>/),
        html.match(/"title":"([^"]+)"/),
        html.match(/property="og:title" content="([^"]+)"/),
        html.match(/<meta name="title" content="([^"]+)"/),
      ]
      
      for (const match of titleMatches) {
        if (match && match[1]) {
          videoTitle = match[1]
            .replace(' - YouTube', '')
            .replace(/\\u[\dA-F]{4}/gi, '') // Remove unicode escapes
            .replace(/\\/g, '')
            .trim()
          break
        }
      }
      
      console.log('Extracted title:', videoTitle)
      
      // Extract description with multiple patterns
      const descriptionMatches = [
        html.match(/"shortDescription":"([^"]+)"/),
        html.match(/"description":{"simpleText":"([^"]+)"}/),
        html.match(/property="og:description" content="([^"]+)"/),
        html.match(/<meta name="description" content="([^"]+)"/),
      ]
      
      for (const match of descriptionMatches) {
        if (match && match[1]) {
          videoDescription = match[1]
            .replace(/\\n/g, ' ')
            .replace(/\\"/g, '"')
            .replace(/\\u[\dA-F]{4}/gi, '') // Remove unicode escapes
            .replace(/\\/g, '')
            .trim()
          break
        }
      }
      
      console.log('Extracted description length:', videoDescription.length)
      
      // Try to extract any other metadata
      const keywordsMatch = html.match(/"keywords":\[([^\]]+)\]/)
      let keywords = ''
      if (keywordsMatch) {
        keywords = keywordsMatch[1]
          .replace(/"/g, '')
          .replace(/,/g, ' ')
          .trim()
      }
      
      // Combine available content
      content = [videoTitle, videoDescription, keywords]
        .filter(Boolean)
        .join('. ')
        .substring(0, 3000) // Limit total content
      
    } catch (fetchError) {
      console.error('Failed to fetch YouTube page:', fetchError)
      return NextResponse.json(
        { 
          error: 'Unable to access YouTube video information. The video may be private, age-restricted, or temporarily unavailable.',
          suggestion: 'Please try a different public YouTube video.'
        },
        { status: 400 }
      )
    }

    // Validate we have some content
    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        { 
          error: 'Could not extract sufficient content from YouTube video. The video may have limited metadata or may be restricted.',
          suggestion: 'Try a video with a detailed title and description.'
        },
        { status: 400 }
      )
    }

    // Use video title or create fallback
    if (!videoTitle) {
      videoTitle = `YouTube Video ${videoId}`
    }

    console.log('Final content length:', content.length)

    // AI Analysis
    let analysis
    try {
      const { summarizeAndCategorize } = await import('@/lib/groq')
      console.log('Starting AI analysis for YouTube metadata...')
      
      const contextualContent = `YouTube video metadata - Title: ${videoTitle}. Description and details: ${content}`
      analysis = await summarizeAndCategorize(contextualContent, videoTitle)
      console.log('AI analysis completed:', analysis)
    } catch (groqError) {
      console.error('AI analysis error:', groqError)
      
      // Fallback analysis
      const wordCount = content.split(/\s+/).length
      
      analysis = {
        summary: `YouTube video "${videoTitle}" processed from available metadata and description. Contains approximately ${wordCount} words of descriptive content. Note: This summary is based on video metadata rather than transcript, as captions were not accessible.`,
        category: 'Technical',
        department: 'Operations'
      }
    }

    // Generate document
    const generateId = () => Math.random().toString(36).substr(2, 9)

    const document = {
      id: generateId(),
      title: videoTitle,
      summary: analysis.summary,
      category: analysis.category,
      department: analysis.department,
      uploadDate: new Date().toISOString(),
      type: 'youtube' as const,
      originalUrl: url,
      content: content.substring(0, 10000),
    }

    console.log('YouTube video processed successfully (simple method)!')
    console.log('Video title:', videoTitle)
    console.log('Summary:', analysis.summary)
    
    return NextResponse.json(document)
    
  } catch (error) {
    console.error('Unexpected error in simple YouTube processing:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process YouTube video using simple method.',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try a different public YouTube video with accessible metadata.'
      },
      { status: 500 }
    )
  }
}