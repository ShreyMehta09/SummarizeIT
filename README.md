# SumIT - AI-Powered Document Summarization

Transform any content into intelligent insights with AI-powered summarization and categorization.

## Features

- 📄 **PDF Processing** - Upload and summarize PDF documents
- 🌐 **Website Analysis** - Process web articles and content
- 🎥 **YouTube Videos** - Analyze video transcripts and content
- 🔐 **User Authentication** - Secure login with MongoDB storage
- 📊 **Rate Limiting** - 5 free requests per day per user
- 🎨 **Dark/Light Theme** - Modern, responsive interface
- 📱 **Mobile Friendly** - Works on all devices

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env.local` with your MongoDB connection:
```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret
GROQ_API_KEY=your-groq-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run the Application
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to start using SumIT.

## Usage

1. **Sign Up** - Create an account with email and password
2. **Sign In** - Log in to access all features
3. **Upload Content** - Choose from PDF, URL, or YouTube video
4. **Get Insights** - Receive AI-generated summaries and categorization
5. **Manage Documents** - View, organize, and delete your processed content

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **Authentication**: JWT with bcrypt
- **AI**: Groq API for content processing

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── auth/          # Authentication endpoints
│   ├── globals.css        # Global styles
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── AuthModal.tsx      # Authentication modal
│   └── UsageIndicator.tsx # Daily usage tracker
├── lib/                   # Utility libraries
│   ├── models/            # Data models
│   ├── mongodb.ts         # Database connection
│   ├── userService.ts     # User management
│   ├── emailService.ts    # Logging service
│   ├── groq.ts           # AI processing
│   └── utils.ts          # Utility functions
└── .env.local            # Environment variables
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/process-pdf` - Process PDF files
- `POST /api/process-url` - Process website URLs
- `POST /api/process-youtube` - Process YouTube videos

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ HTTP-only cookies
- ✅ Input validation
- ✅ Rate limiting
- ✅ CORS protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
