# Document Summarizer & Categorizer

An AI-powered document management system that automatically extracts, summarizes, and categorizes content from PDFs and web URLs using the Groq API.

## Features

- **PDF Upload**: Upload PDF documents for automatic text extraction
- **URL Processing**: Enter web URLs to extract and process content
- **AI Summarization**: Generate concise summaries using Groq's LLaMA model
- **Auto-Categorization**: Automatically categorize documents by topic and department
- **Searchable Knowledge Base**: Full-text search across all processed documents
- **Filter & Sort**: Filter by category, department, and document type
- **Responsive Design**: Modern, mobile-friendly interface

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI Processing**: Groq API with LLaMA 3 model
- **PDF Processing**: pdf-parse library
- **Web Scraping**: Axios + Cheerio
- **Storage**: Local storage (browser-based)

## Setup Instructions

1. **Clone and Install**
   ```bash
   cd e:\dev\SumIT
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.local.example` to `.env.local`
   - Add your Groq API key:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Get Groq API Key**
   - Visit [Groq Console](https://console.groq.com/)
   - Create an account and generate an API key
   - The free tier includes generous usage limits

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open Application**
   - Navigate to `http://localhost:3000`
   - Start uploading PDFs or entering URLs!

## Usage

### Upload PDF Documents
1. Click the upload area or drag & drop PDF files
2. Wait for AI processing to complete
3. View automatically generated summary and categories

### Process Web URLs
1. Enter any web URL in the URL input field
2. Click "Process URL" to extract content
3. AI will summarize and categorize the web content

### Search & Filter
- Use the search bar to find documents by title, summary, or content
- Filter by category (Technical, Business, Legal, etc.)
- Filter by department (Engineering, Sales, HR, etc.)
- View detailed document information in modal popups

## Categories & Departments

**Categories:**
- Technical, Business, Legal, Marketing, HR, Finance, Operations, Research

**Departments:**
- Engineering, Sales, Legal, Marketing, HR, Finance, Operations, Research

## API Endpoints

- `POST /api/process-pdf` - Process uploaded PDF files
- `POST /api/process-url` - Process web URLs

## File Structure

```
├── app/
│   ├── api/
│   │   ├── process-pdf/route.ts
│   │   └── process-url/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CategoryFilter.tsx
│   ├── DocumentList.tsx
│   ├── DocumentModal.tsx
│   ├── DocumentUpload.tsx
│   └── SearchBar.tsx
├── lib/
│   ├── groq.ts
│   └── utils.ts
└── package.json
```

## Limitations

- PDF files only (no other document formats)
- Content is stored in browser local storage
- 10MB file size limit for uploads
- Web scraping may not work for all sites (JavaScript-heavy sites)

## Future Enhancements

- Database integration for persistent storage
- User authentication and multi-user support
- Support for more document formats (Word, PowerPoint, etc.)
- Advanced search with filters and sorting
- Document versioning and history
- Export functionality
- Batch processing capabilities

## Troubleshooting

**PDF Processing Issues:**
- Ensure PDF contains extractable text (not scanned images)
- Check file size is under 10MB

**URL Processing Issues:**
- Verify URL is accessible and returns HTML content
- Some sites may block automated requests

**API Issues:**
- Verify Groq API key is correctly set in `.env.local`
- Check API key has sufficient credits/usage remaining

## License

MIT License - feel free to use and modify as needed.