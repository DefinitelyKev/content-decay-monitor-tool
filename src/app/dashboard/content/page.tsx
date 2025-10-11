'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Content {
  id: string
  url: string
  title: string | null
  targetKeyword: string
  currentPosition: number | null
  previousPosition: number | null
  status: string
  lastCheckedAt: string | null
  site: {
    id: string
    domain: string
  }
}

export default function ContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteIdParam = searchParams.get('siteId')

  const [content, setContent] = useState<Content[]>([])
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState(siteIdParam || '')
  const [filterStatus, setFilterStatus] = useState('all')
  const [adding, setAdding] = useState(false)

  const [formData, setFormData] = useState({
    siteId: siteIdParam || '',
    url: '',
    title: '',
    targetKeyword: '',
  })

  useEffect(() => {
    fetchSites()
    fetchContent()
  }, [filterStatus, selectedSiteId])

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites')
      if (!response.ok) throw new Error('Failed to fetch sites')
      const data = await response.json()
      setSites(data)
    } catch (err) {
      console.error('Error fetching sites:', err)
    }
  }

  const fetchContent = async () => {
    try {
      let url = '/api/content?'
      if (selectedSiteId) url += `siteId=${selectedSiteId}&`
      if (filterStatus !== 'all') url += `status=${filterStatus}&`

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch content')
      const data = await response.json()
      setContent(data)
    } catch (err) {
      setError('Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')

    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add content')
      }

      setFormData({ siteId: siteIdParam || '', url: '', title: '', targetKeyword: '' })
      setShowAddForm(false)
      fetchContent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add content')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return

    try {
      const response = await fetch(`/api/content/${contentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete content')
      fetchContent()
    } catch (err) {
      setError('Failed to delete content')
    }
  }

  const getPositionChange = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null
    const change = previous - current // Positive = improved, Negative = dropped
    if (change === 0) return null
    return change
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading content...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Track rankings and monitor content decay across your sites
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Content
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Site
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sites</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.domain}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="HEALTHY">Healthy</option>
              <option value="WARNING">Warning</option>
              <option value="DECAYING">Decaying</option>
              <option value="RECOVERED">Recovered</option>
            </select>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Content</h2>
          <form onSubmit={handleAddContent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site *
              </label>
              <select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a site</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.domain}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/blog/post"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (optional)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Article title"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Keyword *
              </label>
              <input
                type="text"
                value={formData.targetKeyword}
                onChange={(e) =>
                  setFormData({ ...formData, targetKeyword: e.target.value })
                }
                placeholder="content marketing strategy"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Content'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setError('')
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {content.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-4">No content found</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Your First Content
          </button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Keyword
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Checked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {content.map((item) => {
                const change = getPositionChange(
                  item.currentPosition,
                  item.previousPosition
                )
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {item.title || item.url}
                        </div>
                        <div className="text-sm text-gray-500">{item.site.domain}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.targetKeyword}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.currentPosition ? `#${item.currentPosition}` : 'N/A'}
                        </span>
                        {change && (
                          <span
                            className={`text-xs ${
                              change > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {change > 0 ? '↑' : '↓'} {Math.abs(change)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          item.status === 'HEALTHY'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'WARNING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : item.status === 'DECAYING'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.lastCheckedAt
                        ? new Date(item.lastCheckedAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/content/${item.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDeleteContent(item.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
