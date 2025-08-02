import { getDatabase } from './mongodb'
import { User, UserResponse, transformUser } from './models/User'

// Fallback imports
let bcrypt: any = null
let crypto: any = null
let ObjectId: any = null

try {
  bcrypt = require('bcryptjs')
} catch (error) {
  console.warn('bcryptjs not installed. Using fallback password handling.')
}

try {
  crypto = require('crypto')
} catch (error) {
  console.warn('crypto not available. Using fallback token generation.')
}

try {
  const mongodb = require('mongodb')
  ObjectId = mongodb.ObjectId
} catch (error) {
  console.warn('MongoDB ObjectId not available. Using string IDs.')
  // Fallback ObjectId
  ObjectId = class {
    constructor(id?: string) {
      this.id = id || Math.random().toString(36).substr(2, 24)
    }
    toString() {
      return this.id
    }
  }
}

export class UserService {
  private static readonly COLLECTION_NAME = 'users'

  static async createUser(email: string, name: string, password: string): Promise<UserResponse | null> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      // Check if user already exists
      const existingUser = await collection.findOne({ email: email.toLowerCase() })
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      // Hash password
      const hashedPassword = bcrypt ? await bcrypt.hash(password, 12) : password

      // Create user object
      const newUser: User = {
        email: email.toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        isActive: true,
        createdAt: new Date(),
        emailVerified: true, // Auto-verified since no email system
        verificationToken: crypto ? crypto.randomBytes(32).toString('hex') : Math.random().toString(36)
      }

      // Insert user into database
      const result = await collection.insertOne(newUser)
      
      if (result.insertedId) {
        const createdUser = await collection.findOne({ _id: result.insertedId })
        if (createdUser) {
          return transformUser(createdUser)
        }
      }

      return null
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  static async authenticateUser(email: string, password: string): Promise<UserResponse | null> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      // Find user by email
      const user = await collection.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      })

      if (!user) {
        return null
      }

      // Verify password
      const isValidPassword = bcrypt 
        ? await bcrypt.compare(password, user.password)
        : password === user.password // Fallback for development

      if (!isValidPassword) {
        return null
      }

      // Update last login
      await collection.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      )

      return transformUser(user)
    } catch (error) {
      console.error('Error authenticating user:', error)
      return null
    }
  }

  static async getUserById(userId: string): Promise<UserResponse | null> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      const user = await collection.findOne({ 
        _id: ObjectId ? new ObjectId(userId) : userId,
        isActive: true 
      })

      return user ? transformUser(user) : null
    } catch (error) {
      console.error('Error getting user by ID:', error)
      return null
    }
  }

  static async getUserByEmail(email: string): Promise<UserResponse | null> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      const user = await collection.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      })

      return user ? transformUser(user) : null
    } catch (error) {
      console.error('Error getting user by email:', error)
      return null
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<UserResponse | null> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      const result = await collection.findOneAndUpdate(
        { _id: ObjectId ? new ObjectId(userId) : userId },
        { $set: updates },
        { returnDocument: 'after' }
      )

      return result.value ? transformUser(result.value) : null
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  }

  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      // Soft delete - mark as inactive
      const result = await collection.updateOne(
        { _id: ObjectId ? new ObjectId(userId) : userId },
        { $set: { isActive: false } }
      )

      return result.modifiedCount > 0
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }

  static async getAllUsers(limit: number = 50, skip: number = 0): Promise<UserResponse[]> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      const users = await collection
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .toArray()

      return users.map(transformUser)
    } catch (error) {
      console.error('Error getting all users:', error)
      return []
    }
  }

  static async getUserStats(): Promise<{
    totalUsers: number
    activeUsers: number
    newUsersToday: number
    newUsersThisWeek: number
  }> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [totalUsers, activeUsers, newUsersToday, newUsersThisWeek] = await Promise.all([
        collection.countDocuments({}),
        collection.countDocuments({ isActive: true }),
        collection.countDocuments({ createdAt: { $gte: today } }),
        collection.countDocuments({ createdAt: { $gte: weekAgo } })
      ])

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek
      }
    } catch (error) {
      console.error('Error getting user stats:', error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        newUsersThisWeek: 0
      }
    }
  }

  static async changePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = bcrypt ? await bcrypt.hash(newPassword, 12) : newPassword
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      const result = await collection.updateOne(
        { _id: ObjectId ? new ObjectId(userId) : userId },
        { $set: { password: hashedPassword } }
      )

      return result.modifiedCount > 0
    } catch (error) {
      console.error('Error changing password:', error)
      return false
    }
  }

  static async verifyEmail(token: string): Promise<boolean> {
    try {
      const db = await getDatabase()
      const collection = db.collection<User>(this.COLLECTION_NAME)

      const result = await collection.updateOne(
        { verificationToken: token },
        { 
          $set: { emailVerified: true },
          $unset: { verificationToken: 1 }
        }
      )

      return result.modifiedCount > 0
    } catch (error) {
      console.error('Error verifying email:', error)
      return false
    }
  }
}