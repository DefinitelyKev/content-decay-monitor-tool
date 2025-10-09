import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createContentSchema = z.object({
  siteId: z.string(),
  url: z.string().url('Invalid URL'),
  title: z.string().optional(),
  targetKeyword: z.string().min(1, 'Target keyword is required'),
})

// GET /api/content - List all content for authenticated user
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const siteId = searchParams.get('siteId')
    const status = searchParams.get('status')

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build where clause
    const where: any = {
      site: {
        userId: user.id,
      },
    }

    if (siteId) {
      where.siteId = siteId
    }

    if (status) {
      where.status = status
    }

    const content = await prisma.content.findMany({
      where,
      include: {
        site: {
          select: {
            id: true,
            domain: true,
          },
        },
        keywords: true,
        rankings: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(content)
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/content - Create new content
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        sites: {
          include: {
            content: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = createContentSchema.parse(body)

    // Verify site belongs to user
    const site = await prisma.site.findFirst({
      where: {
        id: validatedData.siteId,
        userId: user.id,
      },
      include: {
        content: true,
      },
    })

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Check plan limits
    const totalContent = user.sites.reduce(
      (acc, s) => acc + s.content.length,
      0
    )
    const limits: Record<string, number> = {
      FREE: 10,
      CREATOR: 50,
      PRO: 200,
      AGENCY: 500,
    }

    if (totalContent >= limits[user.planTier]) {
      return NextResponse.json(
        {
          error: `Content limit reached for ${user.planTier} plan`,
          limit: limits[user.planTier],
        },
        { status: 403 }
      )
    }

    // Check if content already exists
    const existingContent = await prisma.content.findUnique({
      where: {
        siteId_url: {
          siteId: validatedData.siteId,
          url: validatedData.url,
        },
      },
    })

    if (existingContent) {
      return NextResponse.json(
        { error: 'Content already exists for this site' },
        { status: 400 }
      )
    }

    const content = await prisma.content.create({
      data: {
        siteId: validatedData.siteId,
        url: validatedData.url,
        title: validatedData.title,
        targetKeyword: validatedData.targetKeyword,
      },
      include: {
        site: true,
        keywords: true,
      },
    })

    // Create the target keyword entry
    await prisma.keyword.create({
      data: {
        contentId: content.id,
        keyword: validatedData.targetKeyword,
      },
    })

    return NextResponse.json(content, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
