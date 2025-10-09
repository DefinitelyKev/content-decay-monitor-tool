import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateSiteSchema = z.object({
  domain: z.string().url('Invalid domain URL').optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ERROR']).optional(),
  gscConnected: z.boolean().optional(),
})

type RouteParams = { params: Promise<{ siteId: string }> }

// GET /api/sites/[siteId] - Get a specific site
export async function GET(req: Request, context: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = await context.params
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: user.id,
      },
      include: {
        content: {
          include: {
            keywords: true,
            rankings: {
              orderBy: { date: 'desc' },
              take: 30,
            },
          },
        },
      },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    return NextResponse.json(site)
  } catch (error) {
    console.error('Error fetching site:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/sites/[siteId] - Update a site
export async function PATCH(req: Request, context: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = await context.params
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = updateSiteSchema.parse(body)

    // Verify site belongs to user
    const existingSite = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: user.id,
      },
    })

    if (!existingSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const updatedSite = await prisma.site.update({
      where: { id: siteId },
      data: validatedData,
    })

    return NextResponse.json(updatedSite)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating site:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/sites/[siteId] - Delete a site
export async function DELETE(req: Request, context: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = await context.params
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify site belongs to user
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: user.id,
      },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    await prisma.site.delete({
      where: { id: siteId },
    })

    return NextResponse.json({ message: 'Site deleted successfully' })
  } catch (error) {
    console.error('Error deleting site:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
