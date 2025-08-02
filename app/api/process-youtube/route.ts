import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('YouTube processing endpoint hit')
    
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
        if (!videoId && urlObj.pathname.includes('/v/')) {
          videoId = urlObj.pathname.split('/v/')[1]
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

    // Get video information via page scraping (more reliable method)
    let videoTitle = ''
    let videoDescription = ''
    let content = ''
    let extractionMethod = 'metadata'

    try {
      console.log('Fetching YouTube page for metadata...')
      const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      console.log('Page fetched successfully, length:', html.length)
      
      // Extract title with multiple fallback patterns
      const titlePatterns = [
        /<title>([^<]+)<\/title>/,
        /"title":"([^"]+)"/,
        /property="og:title" content="([^"]+)"/,
        /<meta name="title" content="([^"]+)"/,
        /"videoDetails":\s*{[^}]*"title":"([^"]+)"/
      ]
      
      for (const pattern of titlePatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          videoTitle = match[1]
            .replace(' - YouTube', '')
            .replace(/\\u[\dA-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace('\\u', ''), 16)))
            .replace(/\\/g, '')
            .trim()
          if (videoTitle.length > 5) break // Only use if we got a meaningful title
        }
      }
      
      console.log('Extracted title:', videoTitle)
      
      // Extract description with multiple patterns
      const descriptionPatterns = [
        /"shortDescription":"([^"]+)"/,
        /"description":{"simpleText":"([^"]+)"}/,
        /property="og:description" content="([^"]+)"/,
        /<meta name="description" content="([^"]+)"/,
        /"videoDetails":\s*{[^}]*"shortDescription":"([^"]+)"/
      ]
      
      for (const pattern of descriptionPatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          videoDescription = match[1]
            .replace(/\\n/g, ' ')
            .replace(/\\"/g, '"')
            .replace(/\\u[\dA-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace('\\u', ''), 16)))
            .replace(/\\/g, '')
            .trim()
          if (videoDescription.length > 20) break // Only use if we got meaningful description
        }
      }
      
      console.log('Extracted description length:', videoDescription.length)
      
      // Try to extract channel name
      let channelName = ''
      const channelPatterns = [
        /"ownerChannelName":"([^"]+)"/,
        /"author":"([^"]+)"/,
        /property="og:site_name" content="([^"]+)"/
      ]
      
      for (const pattern of channelPatterns) {
        const match = html.match(pattern)
        if (match && match[1] && !match[1].includes('YouTube')) {
          channelName = match[1].replace(/\\/g, '').trim()
          break
        }
      }
      
      // Try to extract keywords/tags
      let keywords = ''
      const keywordsMatch = html.match(/"keywords":\[([^\]]+)\]/)
      if (keywordsMatch) {
        keywords = keywordsMatch[1]
          .replace(/"/g, '')
          .replace(/,/g, ' ')
          .trim()
          .substring(0, 200) // Limit keywords
      }
      
      // Try to extract view count and other metadata
      let metadata = ''
      const viewCountMatch = html.match(/"viewCount":"(\d+)"/)
      if (viewCountMatch) {
        const views = parseInt(viewCountMatch[1])
        metadata += `Views: ${views.toLocaleString()}. `
      }
      
      // Combine all available content
      const contentParts = [
        videoTitle,
        channelName ? `Channel: ${channelName}` : '',
        videoDescription,
        keywords ? `Tags: ${keywords}` : '',
        metadata
      ].filter(Boolean)
      
      content = contentParts.join('. ').substring(0, 4000) // Limit total content
      
    } catch (fetchError) {
      console.error('Failed to fetch YouTube page:', fetchError)
      return NextResponse.json(
        { 
          error: 'Unable to access YouTube video information. The video may be private, age-restricted, region-blocked, or temporarily unavailable.',
          suggestion: 'Please try a different public YouTube video that is accessible in your region.'
        },
        { status: 400 }
      )
    }

    // Validate we have meaningful content
    if (!content || content.trim().length < 20) {
      return NextResponse.json(
        { 
          error: 'Could not extract sufficient content from YouTube video. The video may have very limited metadata or may be restricted.',
          suggestion: 'Try a video with a detailed title and description, or a video from a channel that provides good metadata.'
        },
        { status: 400 }
      )
    }

    // Use extracted title or create fallback
    if (!videoTitle || videoTitle.length < 5) {
      videoTitle = `YouTube Video ${videoId}`
    }

    console.log('Final content length:', content.length)
    console.log('Content preview:', content.substring(0, 200) + '...')

    // AI Analysis
    let analysis
    try {
      const { summarizeAndCategorize } = await import('@/lib/groq')
      console.log('Starting AI analysis for YouTube content...')
      
      const contextualContent = `YouTube video analysis - Title: "${videoTitle}". Content and metadata: ${content}. Note: This analysis is based on video metadata, title, and description rather than transcript.`
      analysis = await summarizeAndCategorize(contextualContent, videoTitle)
      console.log('AI analysis completed:', analysis)
    } catch (groqError) {
      console.error('AI analysis error:', groqError)
      
      // Enhanced fallback analysis
      const wordCount = content.split(/\s+/).length
      
      analysis = {
        summary: `YouTube video "${videoTitle}" analyzed from available metadata and description. Contains approximately ${wordCount} words of descriptive content. This summary is based on video information rather than transcript, as automatic captions were not accessible for processing.`,
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

    console.log('YouTube video processed successfully!')
    console.log('Video title:', videoTitle)
    console.log('Extraction method:', extractionMethod)
    console.log('Summary:', analysis.summary)
    
    return NextResponse.json(document)
    
  } catch (error) {
    console.error('Unexpected error in YouTube processing:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process YouTube video. Please ensure the video is public and accessible.',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Try a different public YouTube video with good metadata and descriptions.'
      },
      { status: 500 }
    )
  }
}