import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
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
  const decayingContent = dbUser.sites.reduce(
    (acc, site) =>
      acc + site.content.filter((c) => c.status === 'DECAYING').length,
    0
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user.firstName || user.emailAddresses[0].emailAddress}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-600">Total Sites</div>
          <div className="mt-2 text-3xl font-bold">{totalSites}</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-600">
            Content Tracked
          </div>
          <div className="mt-2 text-3xl font-bold">{totalContent}</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm font-medium text-gray-600">
            Decaying Content
          </div>
          <div className="mt-2 text-3xl font-bold text-red-600">
            {decayingContent}
          </div>
        </div>
      </div>

      {/* Content List Placeholder */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold">Recent Content</h2>
        {totalContent === 0 ? (
          <div className="mt-4 text-center text-gray-500">
            No content tracked yet. Add your first site to get started.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {dbUser.sites.map((site) =>
              site.content.slice(0, 5).map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between border-b py-2"
                >
                  <div>
                    <div className="font-medium">{content.title || content.url}</div>
                    <div className="text-sm text-gray-500">{content.targetKeyword}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      Position: {content.currentPosition || 'N/A'}
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
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
