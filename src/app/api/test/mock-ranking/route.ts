import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/test/mock-ranking - Add mock ranking data for testing
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId, position } = await req.json()

    if (!contentId || !position) {
      return NextResponse.json(
        { error: 'contentId and position are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get content
    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        site: {
          userId: user.id,
        },
      },
      include: {
        keywords: true,
      },
    })

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Get or create keyword
    let keyword = content.keywords.find((k) => k.keyword === content.targetKeyword)
    if (!keyword) {
      keyword = await prisma.keyword.create({
        data: {
          contentId: content.id,
          keyword: content.targetKeyword,
        },
      })
    }

    // Create ranking record
    await prisma.ranking.create({
      data: {
        contentId: content.id,
        keywordId: keyword.id,
        position: parseInt(position),
        date: new Date(),
      },
    })

    // Update content
    const updateData: any = {
      previousPosition: content.currentPosition,
      currentPosition: parseInt(position),
      lastCheckedAt: new Date(),
    }

    if (!content.highestPosition || position < content.highestPosition) {
      updateData.highestPosition = parseInt(position)
    }

    // Simple status update
    if (content.currentPosition && position > content.currentPosition + 5) {
      updateData.status = 'DECAYING'
    } else if (content.currentPosition && position > content.currentPosition + 3) {
      updateData.status = 'WARNING'
    } else if (content.currentPosition && position < content.currentPosition - 3) {
      updateData.status = 'RECOVERED'
    } else {
      updateData.status = 'HEALTHY'
    }

    await prisma.content.update({
      where: { id: content.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: `Mock ranking added: Position #${position}`,
      status: updateData.status,
    })
  } catch (error) {
    console.error('Error adding mock ranking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
