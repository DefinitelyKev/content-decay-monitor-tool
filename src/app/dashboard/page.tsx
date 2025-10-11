import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/prisma'

export default async function DashboardPage() {
  const user = await currentUser()

  if (!user) {
    redirect('/sign-in')
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: {
      sites: {
        include: {
          content: {
            include: {
              keywords: true,
            },
          },
        },
      },
      alerts: {
        orderBy: { triggeredAt: 'desc' },
        take: 5,
        include: {
          content: {
            include: {
              site: true,
            },
          },
        },
      },
    },
  })

  if (!dbUser) {
    return <div>Loading...</div>
  }

  const totalSites = dbUser.sites.length
  const totalContent = dbUser.sites.reduce(
    (acc, site) => acc + site.content.length,
    0
  )
  const healthyContent = dbUser.sites.reduce(
    (acc, site) =>
      acc + site.content.filter((c) => c.status === 'HEALTHY').length,
    0
  )
  const warningContent = dbUser.sites.reduce(
    (acc, site) =>
      acc + site.content.filter((c) => c.status === 'WARNING').length,
    0
  )
  const decayingContent = dbUser.sites.reduce(
    (acc, site) =>
      acc + site.content.filter((c) => c.status === 'DECAYING').length,
    0
  )

  const allContent = dbUser.sites.flatMap((site) =>
    site.content.map((c) => ({ ...c, siteDomain: site.domain }))
  )
  const recentContent = allContent
    .sort((a, b) => {
      const aDate = new Date(a.lastCheckedAt || 0)
      const bDate = new Date(b.lastCheckedAt || 0)
      return bDate.getTime() - aDate.getTime()
    })
    .slice(0, 10)

  // Get plan limits
  const planLimits: Record<string, number> = {
    FREE: 10,
    CREATOR: 50,
    PRO: 200,
    AGENCY: 500,
  }
  const contentLimit = planLimits[dbUser.planTier]
  const usagePercentage = Math.round((totalContent / contentLimit) * 100)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user.firstName || user.emailAddresses[0].emailAddress}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/sites"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Site
          </Link>
        </div>
      </div>

      {/* Plan Usage */}
      {totalContent > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-blue-900">
                {dbUser.planTier} Plan
              </span>
              <span className="text-blue-700 text-sm ml-2">
                {totalContent} / {contentLimit} content pieces
              </span>
            </div>
            <span className="text-sm text-blue-700">{usagePercentage}% used</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                usagePercentage >= 90 ? 'bg-red-600' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-600">Total Sites</div>
          <div className="mt-2 text-3xl font-bold">{totalSites}</div>
          <Link href="/dashboard/sites" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
            Manage sites →
          </Link>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-600">Healthy</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{healthyContent}</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-600">Warning</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">{warningContent}</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-600">Decaying</div>
          <div className="mt-2 text-3xl font-bold text-red-600">{decayingContent}</div>
          {decayingContent > 0 && (
            <Link
              href="/dashboard/content?status=DECAYING"
              className="text-sm text-red-600 hover:underline mt-2 inline-block"
            >
              View decaying →
            </Link>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      {dbUser.alerts.length > 0 && (
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Alerts</h2>
            <Link href="/dashboard/alerts" className="text-sm text-blue-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {dbUser.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between border-b pb-3 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {alert.content.title || alert.content.url}
                  </div>
                  <div className="text-sm text-gray-600">{alert.message}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(alert.triggeredAt).toLocaleString()}
                  </div>
                </div>
                <Link
                  href={`/dashboard/content/${alert.content.id}`}
                  className="ml-4 text-sm text-blue-600 hover:underline"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Content */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Content Checks</h2>
          <Link href="/dashboard/content" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        {totalContent === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              No content tracked yet. Get started by adding your first site.
            </div>
            <Link
              href="/dashboard/sites"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Your First Site
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentContent.map((content) => {
              const change =
                content.currentPosition && content.previousPosition
                  ? content.previousPosition - content.currentPosition
                  : null
              return (
                <Link
                  key={content.id}
                  href={`/dashboard/content/${content.id}`}
                  className="flex items-center justify-between border-b pb-3 last:border-b-0 hover:bg-gray-50 -mx-6 px-6 py-3"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {content.title || content.url}
                    </div>
                    <div className="text-sm text-gray-500">
                      {content.siteDomain} • {content.targetKeyword}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {content.currentPosition ? `#${content.currentPosition}` : 'N/A'}
                      </div>
                      {change && (
                        <div
                          className={`text-sm ${
                            change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {change > 0 ? '↑' : '↓'} {Math.abs(change)}
                        </div>
                      )}
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
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
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
