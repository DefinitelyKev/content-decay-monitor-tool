import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateContentSchema = z.object({
  url: z.string().url('Invalid URL').optional(),
  title: z.string().optional(),
  targetKeyword: z.string().min(1).optional(),
  status: z.enum(['HEALTHY', 'WARNING', 'DECAYING', 'RECOVERED']).optional(),
})

type RouteParams = { params: Promise<{ contentId: string }> }

// GET /api/content/[contentId] - Get specific content
export async function GET(req: Request, context: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId } = await context.params
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        site: {
          userId: user.id,
        },
      },
      include: {
        site: true,
        keywords: true,
        rankings: {
          orderBy: { date: 'desc' },
        },
        alerts: {
          orderBy: { triggeredAt: 'desc' },
        },
      },
    })

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    return NextResponse.json(content)
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/content/[contentId] - Update content
export async function PATCH(req: Request, context: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId } = await context.params
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = updateContentSchema.parse(body)

    // Verify content belongs to user
    const existingContent = await prisma.content.findFirst({
      where: {
        id: contentId,
        site: {
          userId: user.id,
        },
      },
    })

    if (!existingContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const updatedContent = await prisma.content.update({
      where: { id: contentId },
      data: validatedData,
      include: {
        site: true,
        keywords: true,
        rankings: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    })

    return NextResponse.json(updatedContent)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/content/[contentId] - Delete content
export async function DELETE(req: Request, context: RouteParams) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId } = await context.params
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify content belongs to user
    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        site: {
          userId: user.id,
        },
      },
    })

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    await prisma.content.delete({
      where: { id: contentId },
    })

    return NextResponse.json({ message: 'Content deleted successfully' })
  } catch (error) {
    console.error('Error deleting content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
