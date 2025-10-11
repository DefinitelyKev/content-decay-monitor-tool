'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Alert {
  id: string
  alertType: string
  message: string
  triggeredAt: string
  resolvedAt: string | null
  content: {
    id: string
    title: string | null
    url: string
    site: {
      domain: string
    }
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'unresolved'>('all')

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(data)
    } catch (err) {
      setError('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  const filteredAlerts = filter === 'unresolved'
    ? alerts.filter((a) => !a.resolvedAt)
    : alerts

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'CONTENT_DECAY':
        return '⚠️'
      case 'POSITION_DROP':
        return '⚡'
      case 'POSITION_RECOVERED':
        return '✅'
      case 'COMPETITOR_CHANGE':
        return '👀'
      default:
        return '🔔'
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'CONTENT_DECAY':
        return 'border-l-red-500 bg-red-50'
      case 'POSITION_DROP':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'POSITION_RECOVERED':
        return 'border-l-green-500 bg-green-50'
      default:
        return 'border-l-blue-500 bg-blue-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading alerts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-gray-600 mt-1">
            View your content monitoring notifications and ranking changes
          </p>
        </div>
        <div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unresolved')}
            className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Alerts</option>
            <option value="unresolved">Unresolved Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {filteredAlerts.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-4">
            {filter === 'unresolved' ? 'No unresolved alerts' : 'No alerts yet'}
          </p>
          <p className="text-sm text-gray-400">
            Alerts will appear here when ranking changes are detected
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 ${getAlertColor(alert.alertType)} rounded-lg p-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getAlertIcon(alert.alertType)}</span>
                    <span className="font-medium text-gray-900">
                      {alert.alertType.replace(/_/g, ' ')}
                    </span>
                    {!alert.resolvedAt && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                        New
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-2">{alert.message}</p>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Content:</span>{' '}
                      {alert.content.title || alert.content.url}
                    </div>
                    <div>
                      <span className="font-medium">Site:</span>{' '}
                      {alert.content.site.domain}
                    </div>
                    <div>
                      <span className="font-medium">Time:</span>{' '}
                      {new Date(alert.triggeredAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/dashboard/content/${alert.content.id}`}
                  className="ml-4 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
