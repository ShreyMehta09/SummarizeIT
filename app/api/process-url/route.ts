import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { summarizeAndCategorize } from '@/lib/groq'
import { generateId, extractTextFromHTML, isValidUrl } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || !isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      )
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    const html = response.data
    const $ = cheerio.load(html)

    // Extract title
    let title = $('title').text().trim()
    if (!title) {
      title = $('h1').first().text().trim()
    }
    if (!title) {
      title = new URL(url).hostname
    }

    // Remove script and style elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads').remove()

    // Extract main content
    let content = ''
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '.post-content',
      '.entry-content',
      '#content',
      '.container'
    ]

    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0 && element.text().trim().length > content.length) {
        content = element.text().trim()
      }
    }

    // Fallback to body if no main content found
    if (!content || content.length < 100) {
      content = $('body').text().trim()
    }

    // Clean up the content
    content = extractTextFromHTML(content)

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract meaningful content from URL' },
        { status: 400 }
      )
    }

    // Limit content length for processing
    if (content.length > 8000) {
      content = content.substring(0, 8000) + '...'
    }

    // Summarize and categorize using Groq
    const analysis = await summarizeAndCategorize(content, title)

    // Create document object
    const document = {
      id: generateId(),
      title,
      summary: analysis.summary,
      category: analysis.category,
      department: analysis.department,
      uploadDate: new Date().toISOString(),
      type: 'url' as const,
      originalUrl: url,
      content: content.substring(0, 10000), // Limit content length for storage
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error processing URL:', error)
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { error: 'Could not connect to the provided URL' },
          { status: 400 }
        )
      }
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: 'URL not found (404)' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process URL' },
      { status: 500 }
    )
  }
}