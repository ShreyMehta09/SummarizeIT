import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/userService'

// Fallback JWT handling
let jwt: any = null
try {
  jwt = require('jsonwebtoken')
} catch (error) {
  console.warn('jsonwebtoken not installed. Using fallback token verification.')
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      )
    }

    let decoded: any = null

    if (jwt && !token.startsWith('fallback-token-')) {
      // Verify JWT token
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
      } catch (jwtError) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        )
      }
    } else {
      // Fallback: extract user info from localStorage (client-side)
      return NextResponse.json(
        { error: 'Please sign in again' },
        { status: 401 }
      )
    }
    
    // Get user from database
    const user = await UserService.getUserById(decoded.userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified
      }
    })

  } catch (error) {
    console.error('Auth verification error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}