import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkRankings } from '@/lib/dataforseo'
import { checkContentDecay } from '@/lib/decay-detection'
import { sendDecayAlert, sendRecoveryAlert, sendWarningAlert } from '@/lib/alerts'

type RouteParams = { params: Promise<{ contentId: string }> }

// POST /api/content/[contentId]/check - Manually check rankings for specific content
export async function POST(req: Request, context: RouteParams) {
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

    // Get content with all relations
    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        site: {
          userId: user.id,
        },
      },
      include: {
        site: {
          include: {
            user: true,
          },
        },
        keywords: true,
      },
    })

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const keywords = content.keywords.map((k) => k.keyword)

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: 'No keywords configured for this content' },
        { status: 400 }
      )
    }

    // Check rankings via DataForSEO
    const rankings = await checkRankings(content.site.domain, keywords)

    let alertSent = false
    let message = ''

    // Process each keyword ranking
    for (const ranking of rankings) {
      const keyword = content.keywords.find((k) => k.keyword === ranking.keyword)
      if (!keyword) continue

      // Store ranking in database
      await prisma.ranking.create({
        data: {
          contentId: content.id,
          keywordId: keyword.id,
          position: ranking.position || 999,
          date: new Date(),
        },
      })

      // Check for primary keyword (target keyword)
      if (ranking.keyword === content.targetKeyword) {
        const decayResult = checkContentDecay(
          ranking.position,
          content.currentPosition,
          content.highestPosition,
          content.status
        )

        message = decayResult.message

        // Update content with new position
        const updateData: any = {
          previousPosition: content.currentPosition,
          currentPosition: ranking.position,
          status: decayResult.status,
          lastCheckedAt: new Date(),
        }

        // Update highest position if current is better
        if (
          ranking.position &&
          (!content.highestPosition || ranking.position < content.highestPosition)
        ) {
          updateData.highestPosition = ranking.position
        }

        await prisma.content.update({
          where: { id: content.id },
          data: updateData,
        })

        // Send alerts if needed
        if (decayResult.shouldAlert) {
          const title = content.title || content.url

          if (decayResult.status === 'RECOVERED') {
            await sendRecoveryAlert(
              content.site.userId,
              content.id,
              decayResult.message,
              content.site.user.email,
              title,
              ranking.position || 999,
              content.currentPosition || 999
            )
            alertSent = true
          } else if (decayResult.status === 'DECAYING') {
            await sendDecayAlert(
              content.site.userId,
              content.id,
              decayResult.message,
              content.site.user.email,
              title,
              content.url,
              ranking.position || 999,
              content.currentPosition || 999
            )
            alertSent = true
          } else if (decayResult.status === 'WARNING') {
            await sendWarningAlert(
              content.site.userId,
              content.id,
              decayResult.message,
              content.site.user.email,
              title,
              content.url,
              ranking.position || 999,
              content.currentPosition || 999
            )
            alertSent = true
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: message || 'Rankings checked successfully',
      keywordsChecked: keywords.length,
      alertSent,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error checking content rankings:', error)
    return NextResponse.json(
      {
        error: 'Failed to check rankings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
