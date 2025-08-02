'use client'

import { useEffect, useState } from 'react'
import { RateLimitService, DailyUsage } from '@/lib/auth'

interface UsageIndicatorProps {
  userId: string
  theme: 'light' | 'dark'
  onUsageUpdate?: (usage: DailyUsage) => void
}

export default function UsageIndicator({ userId, theme, onUsageUpdate }: UsageIndicatorProps) {
  const [usage, setUsage] = useState<DailyUsage | null>(null)

  useEffect(() => {
    const updateUsage = () => {
      const currentUsage = RateLimitService.getDailyUsage(userId)
      setUsage(currentUsage)
      onUsageUpdate?.(currentUsage)
    }

    updateUsage()

    // Update usage every 30 seconds to sync across tabs
    const interval = setInterval(updateUsage, 30000)
    
    // Listen for storage changes to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('daily_requests_')) {
        updateUsage()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [userId, onUsageUpdate])

  if (!usage) return null

  const percentage = (usage.requests / usage.maxRequests) * 100
  const remaining = usage.maxRequests - usage.requests

  return (
    <div className={`rounded-lg p-4 border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          Daily Usage
        </h3>
        <span className={`text-sm ${
          remaining === 0 
            ? 'text-red-500' 
            : remaining <= 2 
            ? 'text-yellow-500' 
            : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {usage.requests}/{usage.maxRequests}
        </span>
      </div>
      
      <div className={`w-full bg-gray-200 rounded-full h-2 mb-2 ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            percentage >= 100 
              ? 'bg-red-500' 
              : percentage >= 80 
              ? 'bg-yellow-500' 
              : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      
      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        {remaining > 0 
          ? `${remaining} request${remaining === 1 ? '' : 's'} remaining today`
          : 'Daily limit reached. Resets tomorrow.'
        }
      </p>

      {remaining <= 2 && remaining > 0 && (
        <div className={`mt-2 text-xs p-2 rounded ${
          theme === 'dark' 
            ? 'bg-yellow-900/20 text-yellow-300 border border-yellow-800' 
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          ⚠️ You're running low on daily requests!
        </div>
      )}

      {remaining === 0 && (
        <div className={`mt-2 text-xs p-2 rounded ${
          theme === 'dark' 
            ? 'bg-red-900/20 text-red-300 border border-red-800' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          🚫 Daily limit reached. Your requests will reset tomorrow.
        </div>
      )}
    </div>
  )
}