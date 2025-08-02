import { ObjectId } from 'mongodb'

export interface User {
  _id?: ObjectId
  id?: string
  email: string
  name: string
  password: string
  isActive: boolean
  createdAt: Date
  lastLogin?: Date
  emailVerified: boolean
  verificationToken?: string
}

export interface UserResponse {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
  emailVerified: boolean
}

export function transformUser(user: User): UserResponse {
  return {
    id: user._id?.toString() || user.id || '',
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.lastLogin?.toISOString(),
    emailVerified: user.emailVerified
  }
}