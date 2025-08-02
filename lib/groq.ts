import Groq from 'groq-sdk'

let groq: Groq | null = null

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
}

export async function summarizeAndCategorize(content: string, title: string) {
  // If no Groq API key is configured, use fallback logic
  if (!groq) {
    console.warn('Groq API key not configured, using fallback categorization')
    return generateFallbackAnalysis(content, title)
  }

  try {
    const prompt = `
Analyze the following document text content and provide:
1. A concise summary (2-3 sentences) focusing ONLY on the readable text content
2. A category from: Technical, Business, Legal, Marketing, HR, Finance, Operations, Research
3. A department from: Engineering, Sales, Legal, Marketing, HR, Finance, Operations, Research

IMPORTANT INSTRUCTIONS:
- Focus ONLY on the text content provided
- IGNORE any references to images, figures, charts, or graphics in your summary
- Base your analysis solely on the readable text information
- If the text mentions images/figures, acknowledge them briefly but focus on the textual information
- Provide a summary of what the text content discusses, not what images might show
- Ignore any image artifacts or non-text elements

Document Title: ${title}
Document Text Content: ${content}

Please respond in the following JSON format:
{
  "summary": "Your summary here based only on text content",
  "category": "Category name",
  "department": "Department name"
}
`

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama3-8b-8192',
      temperature: 0.3,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from Groq API')
    }

    // Try to parse JSON response
    try {
      const parsed = JSON.parse(response)
      return {
        summary: parsed.summary || 'Summary not available',
        category: parsed.category || 'Technical',
        department: parsed.department || 'Operations',
      }
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.warn('Failed to parse JSON response, using fallback')
      return generateFallbackAnalysis(content, title)
    }
  } catch (error) {
    console.error('Error with Groq API:', error)
    // Return fallback values
    return generateFallbackAnalysis(content, title)
  }
}

function generateFallbackAnalysis(content: string, title: string) {
  // Simple keyword-based categorization focusing on text content
  const lowerContent = (content + ' ' + title).toLowerCase()
  
  let category = 'Technical'
  let department = 'Operations'
  
  // Category detection based on text content
  if (lowerContent.includes('legal') || lowerContent.includes('contract') || lowerContent.includes('compliance') || lowerContent.includes('law')) {
    category = 'Legal'
    department = 'Legal'
  } else if (lowerContent.includes('marketing') || lowerContent.includes('campaign') || lowerContent.includes('brand') || lowerContent.includes('advertisement')) {
    category = 'Marketing'
    department = 'Marketing'
  } else if (lowerContent.includes('hr') || lowerContent.includes('human resources') || lowerContent.includes('employee') || lowerContent.includes('personnel')) {
    category = 'HR'
    department = 'HR'
  } else if (lowerContent.includes('finance') || lowerContent.includes('budget') || lowerContent.includes('financial') || lowerContent.includes('accounting')) {
    category = 'Finance'
    department = 'Finance'
  } else if (lowerContent.includes('sales') || lowerContent.includes('revenue') || lowerContent.includes('customer') || lowerContent.includes('client')) {
    category = 'Business'
    department = 'Sales'
  } else if (lowerContent.includes('engineering') || lowerContent.includes('technical') || lowerContent.includes('development') || lowerContent.includes('software')) {
    category = 'Technical'
    department = 'Engineering'
  } else if (lowerContent.includes('research') || lowerContent.includes('study') || lowerContent.includes('analysis') || lowerContent.includes('investigation')) {
    category = 'Research'
    department = 'Research'
  }
  
  // Generate a simple summary focusing on text content
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20)
  let summary = sentences.slice(0, 2).join('. ').trim()
  
  if (summary.length > 0) {
    summary += '.'
  } else {
    // Count meaningful words for fallback summary
    const words = content.split(/\s+/).filter(word => 
      word.length > 2 && /[a-zA-Z]/.test(word)
    )
    summary = `Document "${title}" contains ${words.length} words of text content. The document discusses ${category.toLowerCase()} topics relevant to the ${department} department.`
  }
  
  // Add note about focusing on text content
  if (content.includes('image') || content.includes('figure') || content.includes('chart')) {
    summary += ' (Analysis based on text content only, images and graphics were not processed.)'
  }
  
  return {
    summary: summary || `Document about ${title}. Contains ${content.length} characters of text content.`,
    category,
    department
  }
}

export default groq