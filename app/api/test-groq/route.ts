import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function GET() {
  try {
    const apiKey = process.env.GROQ_API_KEY
    
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return NextResponse.json({
        valid: false,
        message: 'API key not configured'
      })
    }

    const groq = new Groq({
      apiKey: apiKey,
    })

    // Test with a simple request
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'Say "API key is working" if you can read this.',
        },
      ],
      model: 'llama3-8b-8192',
      temperature: 0,
      max_tokens: 10,
    })

    const response = completion.choices[0]?.message?.content

    return NextResponse.json({
      valid: true,
      message: 'API key is working',
      response: response
    })
  } catch (error) {
    console.error('Groq API test error:', error)
    return NextResponse.json({
      valid: false,
      message: 'API key test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}