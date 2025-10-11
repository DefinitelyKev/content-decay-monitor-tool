'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Content {
  id: string
  url: string
  title: string | null
  targetKeyword: string
  currentPosition: number | null
  previousPosition: number | null
  highestPosition: number | null
  status: string
  lastCheckedAt: string | null
  site: {
    id: string
    domain: string
  }
  rankings: Array<{
    id: string
    position: number
    date: string
  }>
  keywords: Array<{
    id: string
    keyword: string
    position: number | null
  }>
}

export default function ContentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contentId = params.contentId as string

  const [content, setContent] = useState<Content | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState('')

  useEffect(() => {
    fetchContent()
  }, [contentId])

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/content/${contentId}`)
      if (!response.ok) throw new Error('Failed to fetch content')
      const data = await response.json()
      setContent(data)
    } catch (err) {
      setError('Failed to load content details')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckNow = async () => {
    setChecking(true)
    setCheckMessage('')
    setError('')

    try {
      const response = await fetch(`/api/content/${contentId}/check`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check rankings')
      }

      setCheckMessage(data.message)
      // Refresh content to show updated rankings
      await fetchContent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check rankings')
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Content not found'}
        </div>
        <Link
          href="/dashboard/content"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Content
        </Link>
      </div>
    )
  }

  // Prepare chart data (reverse to show oldest to newest)
  const chartData = content.rankings
    .slice()
    .reverse()
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      position: r.position,
    }))

  const positionChange = content.currentPosition && content.previousPosition
    ? content.previousPosition - content.currentPosition
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/dashboard/content" className="hover:text-gray-900">
          Content
        </Link>
        <span>/</span>
        <span className="text-gray-900">Details</span>
      </div>

      {checkMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {checkMessage}
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">
              {content.title || content.url}
            </h1>
            <div className="space-y-1 text-sm text-gray-600">
              <div>
                <span className="font-medium">Site:</span> {content.site.domain}
              </div>
              <div>
                <span className="font-medium">URL:</span>{' '}
                <a
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {content.url}
                </a>
              </div>
              <div>
                <span className="font-medium">Target Keyword:</span>{' '}
                {content.targetKeyword}
              </div>
            </div>
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium rounded ${
              content.status === 'HEALTHY'
                ? 'bg-green-100 text-green-800'
                : content.status === 'WARNING'
                ? 'bg-yellow-100 text-yellow-800'
                : content.status === 'DECAYING'
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {content.status}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm text-gray-600">Current Position</div>
            <div className="text-2xl font-bold mt-1">
              {content.currentPosition ? `#${content.currentPosition}` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Previous Position</div>
            <div className="text-2xl font-bold mt-1">
              {content.previousPosition ? `#${content.previousPosition}` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Best Position</div>
            <div className="text-2xl font-bold mt-1 text-green-600">
              {content.highestPosition ? `#${content.highestPosition}` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Change</div>
            <div className="text-2xl font-bold mt-1">
              {positionChange ? (
                <span
                  className={positionChange > 0 ? 'text-green-600' : 'text-red-600'}
                >
                  {positionChange > 0 ? '↑' : '↓'} {Math.abs(positionChange)}
                </span>
              ) : (
                'N/A'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Chart */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Ranking History</h2>
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No ranking data yet. Checks will be performed daily.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                reversed
                domain={[1, 'dataMax + 5']}
                label={{ value: 'Position', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="position"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="text-sm text-gray-500 mt-4">
          Last checked:{' '}
          {content.lastCheckedAt
            ? new Date(content.lastCheckedAt).toLocaleString()
            : 'Never'}
        </p>
      </div>

      {/* Tracked Keywords */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Tracked Keywords</h2>
        <div className="space-y-2">
          {content.keywords.map((kw) => (
            <div
              key={kw.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <span className="font-medium">{kw.keyword}</span>
              <span className="text-gray-600">
                {kw.position ? `#${kw.position}` : 'Not ranked'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/dashboard/content?siteId=${content.site.id}`)}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          ← Back to Content List
        </button>
        <button
          onClick={handleCheckNow}
          disabled={checking}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking Rankings...' : '🔄 Check Rankings Now'}
        </button>
        <a
          href={content.url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          View Live Content →
        </a>
      </div>
    </div>
  )
}
