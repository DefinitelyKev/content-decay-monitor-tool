import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { checkRankings } from '@/lib/dataforseo'
import { checkContentDecay } from '@/lib/decay-detection'
import { sendDecayAlert, sendRecoveryAlert, sendWarningAlert } from '@/lib/alerts'

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Starting rank check cron job...')

    // Get all active content with keywords
    const contentItems = await prisma.content.findMany({
      where: {
        site: {
          status: 'ACTIVE',
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

    console.log(`Found ${contentItems.length} content items to check`)

    let checkedCount = 0
    let alertsSent = 0
    const errors: string[] = []

    // Process each content piece
    for (const content of contentItems) {
      try {
        const keywords = content.keywords.map((k) => k.keyword)

        if (keywords.length === 0) {
          console.log(`Skipping ${content.url} - no keywords`)
          continue
        }

        console.log(`Checking rankings for ${content.url} (${keywords.length} keywords)`)

        // Check rankings via DataForSEO
        const rankings = await checkRankings(content.site.domain, keywords)

        // Process each keyword ranking
        for (const ranking of rankings) {
          const keyword = content.keywords.find((k) => k.keyword === ranking.keyword)
          if (!keyword) continue

          // Store ranking in database
          await prisma.ranking.create({
            data: {
              contentId: content.id,
              keywordId: keyword.id,
              position: ranking.position || 999, // 999 = not found in top 100
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

            console.log(
              `Content ${content.url}: ${decayResult.status} - ${decayResult.message}`
            )

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
              console.log(`New best position for ${content.url}: #${ranking.position}`)
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
                alertsSent++
                console.log(`Recovery alert sent for ${content.url}`)
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
                alertsSent++
                console.log(`Decay alert sent for ${content.url}`)
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
                alertsSent++
                console.log(`Warning alert sent for ${content.url}`)
              }
            }
          }

          checkedCount++
        }

        // Rate limiting - avoid hitting API limits (100ms between requests)
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error checking content ${content.id}:`, error)
        errors.push(`${content.url}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        // Continue with next content item
      }
    }

    console.log('Rank check cron job completed successfully')

    return NextResponse.json({
      success: true,
      contentItemsProcessed: contentItems.length,
      keywordsChecked: checkedCount,
      alertsSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggering
export async function POST(req: Request) {
  return GET(req)
}
