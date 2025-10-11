'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Site {
  id: string
  domain: string
  gscConnected: boolean
  status: string
  createdAt: string
  content: { id: string; status: string }[]
}

export default function SitesPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites')
      if (!response.ok) throw new Error('Failed to fetch sites')
      const data = await response.json()
      setSites(data)
    } catch (err) {
      setError('Failed to load sites')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setError('')

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add site')
      }

      setNewDomain('')
      setShowAddForm(false)
      fetchSites()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add site')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Are you sure? This will delete all content for this site.')) return

    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete site')
      fetchSites()
    } catch (err) {
      setError('Failed to delete site')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading sites...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sites</h1>
          <p className="text-gray-600 mt-1">
            Manage the sites you're monitoring for content decay
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Site
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Site</h2>
          <form onSubmit={handleAddSite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain URL
              </label>
              <input
                type="url"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the full URL of your site
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Site'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewDomain('')
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

      {sites.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <p className="text-gray-500 mb-4">No sites added yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Your First Site
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => {
            const healthyCount = site.content.filter(
              (c) => c.status === 'HEALTHY'
            ).length
            const warningCount = site.content.filter(
              (c) => c.status === 'WARNING'
            ).length
            const decayingCount = site.content.filter(
              (c) => c.status === 'DECAYING'
            ).length

            return (
              <div
                key={site.id}
                className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{site.domain}</h3>
                    <p className="text-sm text-gray-500">
                      {site.content.length} content pieces
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      site.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {site.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Healthy:</span>
                    <span className="font-medium text-green-600">
                      {healthyCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Warning:</span>
                    <span className="font-medium text-yellow-600">
                      {warningCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Decaying:</span>
                    <span className="font-medium text-red-600">
                      {decayingCount}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => router.push(`/dashboard/content?siteId=${site.id}`)}
                    className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    View Content
                  </button>
                  <button
                    onClick={() => handleDeleteSite(site.id)}
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
