import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/lib/userService'
import loggingService from '@/lib/emailService'

// Fallback JWT handling
let jwt: any = null
try {
  jwt = require('jsonwebtoken')
} catch (error) {
  console.warn('jsonwebtoken not installed. Using fallback token generation.')
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate user
    const user = await UserService.authenticateUser(email, password)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Log the login
    loggingService.logUserLogin(user.email, user.name)

    // Generate JWT token or fallback
    let token = 'fallback-token-' + Date.now()
    if (jwt) {
      token = jwt.sign(
        { 
          userId: user.id,
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        emailVerified: user.emailVerified
      },
      token
    })

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}