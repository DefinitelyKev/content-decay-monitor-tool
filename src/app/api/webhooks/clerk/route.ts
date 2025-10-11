import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  logger.info('🔔 Clerk webhook received')

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    logger.error('CLERK_WEBHOOK_SECRET is not set')
    throw new Error('CLERK_WEBHOOK_SECRET is not set')
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create new Svix instance with secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
    logger.info('Webhook signature verified')
  } catch (err) {
    logger.error('Could not verify webhook signature', err)
    return new Response('Error: Verification error', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type
  logger.info('Processing webhook event', { eventType })

  if (eventType === 'user.created') {
    const { id, email_addresses } = evt.data

    const primaryEmail = email_addresses.find(
      (email) => email.id === evt.data.primary_email_address_id
    )

    if (!primaryEmail) {
      logger.error('No primary email found in webhook data')
      return new Response('Error: No primary email', { status: 400 })
    }

    logger.info('Creating user in database', { clerkId: id, email: primaryEmail.email_address })

    // Create user in database
    await prisma.user.create({
      data: {
        clerkId: id,
        email: primaryEmail.email_address,
        planTier: 'FREE',
      },
    })

    logger.success('User created successfully', { clerkId: id, email: primaryEmail.email_address })
    return new Response('User created', { status: 200 })
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses } = evt.data

    const primaryEmail = email_addresses.find(
      (email) => email.id === evt.data.primary_email_address_id
    )

    if (!primaryEmail) {
      logger.error('No primary email found for update')
      return new Response('Error: No primary email', { status: 400 })
    }

    logger.info('Updating user in database', { clerkId: id })

    // Update user in database
    await prisma.user.update({
      where: { clerkId: id },
      data: {
        email: primaryEmail.email_address,
      },
    })

    logger.success('User updated successfully', { clerkId: id })
    return new Response('User updated', { status: 200 })
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data

    if (!id) {
      logger.error('No user ID provided for deletion')
      return new Response('Error: No user ID', { status: 400 })
    }

    logger.info('Deleting user from database', { clerkId: id })

    // Delete user from database
    await prisma.user.delete({
      where: { clerkId: id },
    })

    logger.success('User deleted successfully', { clerkId: id })
    return new Response('User deleted', { status: 200 })
  }

  logger.info('Unhandled webhook event type', { eventType })
  return new Response('Webhook received', { status: 200 })
}
