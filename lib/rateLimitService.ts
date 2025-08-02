// Rate limiting functionality
export interface DailyUsage {
  userId: string
  date: string
  requests: number
  maxRequests: number
}

export class RateLimitService {
  private static readonly MAX_DAILY_REQUESTS = 5

  static getDailyUsage(userId: string): DailyUsage {
    const today = new Date().toDateString()
    const key = `daily_requests_${userId}`
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(key)
      if (stored) {
        const usage: DailyUsage = JSON.parse(stored)
        // Reset if it's a new day
        if (usage.date !== today) {
          const newUsage: DailyUsage = {
            userId,
            date: today,
            requests: 0,
            maxRequests: this.MAX_DAILY_REQUESTS
          }
          localStorage.setItem(key, JSON.stringify(newUsage))
          return newUsage
        }
        return usage
      }
    }

    // Create new usage record
    const newUsage: DailyUsage = {
      userId,
      date: today,
      requests: 0,
      maxRequests: this.MAX_DAILY_REQUESTS
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`daily_requests_${userId}`, JSON.stringify(newUsage))
    }

    return newUsage
  }

  static canMakeRequest(userId: string): boolean {
    const usage = this.getDailyUsage(userId)
    return usage.requests < usage.maxRequests
  }

  static incrementUsage(userId: string): DailyUsage {
    const usage = this.getDailyUsage(userId)
    usage.requests += 1

    if (typeof window !== 'undefined') {
      localStorage.setItem(`daily_requests_${userId}`, JSON.stringify(usage))
    }

    return usage
  }

  static getRemainingRequests(userId: string): number {
    const usage = this.getDailyUsage(userId)
    return Math.max(0, usage.maxRequests - usage.requests)
  }
}