import { Resend } from 'resend'
import prisma from './prisma'
import { AlertType } from '@prisma/client'
import { logger } from './logger'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Send email alert for decaying content
 */
export async function sendDecayAlert(
  userId: string,
  contentId: string,
  message: string,
  userEmail: string,
  contentTitle: string,
  contentUrl: string,
  currentPosition: number,
  previousPosition: number
) {
  logger.alert('Sending decay alert', { contentTitle, userEmail, currentPosition, previousPosition })

  try {
    // Create alert in database
    await prisma.alert.create({
      data: {
        userId,
        contentId,
        alertType: 'CONTENT_DECAY',
        message,
      },
    })
    logger.info('Alert saved to database')

    // Send email notification
    if (process.env.RESEND_API_KEY) {
      logger.info('Sending email via Resend', { to: userEmail })
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const emailResult = await resend.emails.send({
        from: 'ContentDecay.io <onboarding@resend.dev>', // Use verified domain in production
        to: userEmail,
        subject: `⚠️ Content Decay Alert: ${contentTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Content Decay Detected</h2>
            <p><strong>${contentTitle}</strong> is experiencing ranking drops.</p>

            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #991b1b;">${message}</p>
            </div>

            <div style="background: #f9fafb; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 8px 0;"><strong>Current Position:</strong> #${currentPosition}</p>
              <p style="margin: 8px 0;"><strong>Previous Position:</strong> #${previousPosition}</p>
              <p style="margin: 8px 0;"><strong>Change:</strong> ${
                currentPosition - previousPosition > 0 ? '↓' : '↑'
              } ${Math.abs(currentPosition - previousPosition)} positions</p>
            </div>

            <p>
              <a href="${appUrl}/dashboard/content/${contentId}"
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                View Details →
              </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Content URL:</strong><br />
              <a href="${contentUrl}" style="color: #2563eb;">${contentUrl}</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              You're receiving this because you enabled decay monitoring for this content.
            </p>
          </div>
        `,
      })
      logger.success('Email sent successfully', { emailId: emailResult.data?.id })
    } else {
      logger.warn('RESEND_API_KEY not configured - skipping email')
    }
  } catch (error) {
    logger.error('Error sending decay alert', error)
    // Don't throw - we still want the database alert even if email fails
  }
}

/**
 * Send email notification for recovered rankings
 */
export async function sendRecoveryAlert(
  userId: string,
  contentId: string,
  message: string,
  userEmail: string,
  contentTitle: string,
  currentPosition: number,
  previousPosition: number
) {
  try {
    // Create alert in database
    await prisma.alert.create({
      data: {
        userId,
        contentId,
        alertType: 'POSITION_RECOVERED',
        message,
      },
    })

    // Send email notification
    if (process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      await resend.emails.send({
        from: 'ContentDecay.io <onboarding@resend.dev>', // Use verified domain in production
        to: userEmail,
        subject: `✅ Rankings Recovered: ${contentTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Great News! 🎉</h2>
            <p><strong>${contentTitle}</strong> has recovered its rankings.</p>

            <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #166534;">${message}</p>
            </div>

            <div style="background: #f9fafb; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 8px 0;"><strong>Current Position:</strong> #${currentPosition}</p>
              <p style="margin: 8px 0;"><strong>Previous Position:</strong> #${previousPosition}</p>
              <p style="margin: 8px 0; color: #16a34a;"><strong>Improvement:</strong> ↑ ${Math.abs(
                currentPosition - previousPosition
              )} positions</p>
            </div>

            <p>
              <a href="${appUrl}/dashboard/content/${contentId}"
                 style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                View Details →
              </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              Keep up the great work! Continue monitoring to maintain these rankings.
            </p>
          </div>
        `,
      })
    }
  } catch (error) {
    console.error('Error sending recovery alert:', error)
    // Don't throw - we still want the database alert even if email fails
  }
}

/**
 * Send a warning alert (3-4 position drop)
 */
export async function sendWarningAlert(
  userId: string,
  contentId: string,
  message: string,
  userEmail: string,
  contentTitle: string,
  contentUrl: string,
  currentPosition: number,
  previousPosition: number
) {
  try {
    // Create alert in database
    await prisma.alert.create({
      data: {
        userId,
        contentId,
        alertType: 'POSITION_DROP',
        message,
      },
    })

    // Send email notification
    if (process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      await resend.emails.send({
        from: 'ContentDecay.io <onboarding@resend.dev>',
        to: userEmail,
        subject: `⚡ Position Drop Warning: ${contentTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706;">Position Drop Detected</h2>
            <p><strong>${contentTitle}</strong> has dropped in rankings.</p>

            <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">${message}</p>
            </div>

            <div style="background: #f9fafb; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 8px 0;"><strong>Current Position:</strong> #${currentPosition}</p>
              <p style="margin: 8px 0;"><strong>Previous Position:</strong> #${previousPosition}</p>
              <p style="margin: 8px 0; color: #d97706;"><strong>Change:</strong> ↓ ${Math.abs(
                currentPosition - previousPosition
              )} positions</p>
            </div>

            <p style="color: #6b7280;">
              Consider refreshing this content soon to prevent further ranking loss.
            </p>

            <p>
              <a href="${appUrl}/dashboard/content/${contentId}"
                 style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">
                View Details →
              </a>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Content URL:</strong><br />
              <a href="${contentUrl}" style="color: #2563eb;">${contentUrl}</a>
            </p>
          </div>
        `,
      })
    }
  } catch (error) {
    console.error('Error sending warning alert:', error)
  }
}
