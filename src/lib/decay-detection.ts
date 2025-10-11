import { ContentStatus } from '@prisma/client'
import { logger } from './logger'

interface DecayCheckResult {
  status: ContentStatus
  shouldAlert: boolean
  message: string
  previousStatus?: ContentStatus
}

/**
 * Checks if content is experiencing ranking decay based on position changes
 *
 * Algorithm:
 * - DECAYING: Dropped 5+ positions OR 10+ positions from best
 * - WARNING: Dropped 3-4 positions
 * - RECOVERED: Improved 3+ positions (from WARNING/DECAYING state)
 * - HEALTHY: Stable or minor changes
 */
export function checkContentDecay(
  currentPosition: number | null,
  previousPosition: number | null,
  highestPosition: number | null,
  previousStatus: ContentStatus = 'HEALTHY'
): DecayCheckResult {
  logger.decay('Checking content decay', {
    currentPosition,
    previousPosition,
    highestPosition,
    previousStatus,
  })

  // No position data yet
  if (currentPosition === null) {
    logger.decay('No position data available')
    return {
      status: 'HEALTHY',
      shouldAlert: false,
      message: 'No ranking data available yet',
      previousStatus,
    }
  }

  // First check - no previous data
  if (previousPosition === null) {
    logger.decay('First ranking check', { position: currentPosition })
    return {
      status: 'HEALTHY',
      shouldAlert: false,
      message: `Initial ranking recorded at position #${currentPosition}`,
      previousStatus,
    }
  }

  // Calculate position changes
  const positionDrop = currentPosition - previousPosition // Positive = dropped, Negative = improved
  const dropFromBest = highestPosition ? currentPosition - highestPosition : 0

  logger.decay('Position analysis', {
    positionDrop,
    dropFromBest,
    change: positionDrop > 0 ? 'dropped' : 'improved',
  })

  // RECOVERED: Improved 3+ positions from a WARNING/DECAYING state
  if (
    positionDrop <= -3 &&
    (previousStatus === 'WARNING' || previousStatus === 'DECAYING')
  ) {
    logger.success('Content recovered!', { improvement: Math.abs(positionDrop) })
    return {
      status: 'RECOVERED',
      shouldAlert: true,
      message: `Rankings recovered! Improved by ${Math.abs(positionDrop)} positions (from #${previousPosition} to #${currentPosition})`,
      previousStatus,
    }
  }

  // DECAYING: Dropped 5+ positions OR 10+ from best position
  if (positionDrop >= 5 || dropFromBest >= 10) {
    const reason =
      positionDrop >= 5
        ? `dropped ${positionDrop} positions`
        : `dropped ${dropFromBest} positions from your best ranking (#${highestPosition})`

    logger.warn('Content is DECAYING', { reason, positionDrop, dropFromBest })
    return {
      status: 'DECAYING',
      shouldAlert: true,
      message: `Content is decaying! Ranking ${reason} (from #${previousPosition} to #${currentPosition})`,
      previousStatus,
    }
  }

  // WARNING: Dropped 3-4 positions
  if (positionDrop >= 3) {
    logger.warn('Content has WARNING status', { positionDrop })
    return {
      status: 'WARNING',
      shouldAlert: true,
      message: `Ranking dropped ${positionDrop} positions (from #${previousPosition} to #${currentPosition})`,
      previousStatus,
    }
  }

  // HEALTHY: Stable or minor changes
  if (positionDrop !== 0) {
    const direction = positionDrop > 0 ? 'dropped' : 'improved'
    logger.info(`Content is HEALTHY (${direction})`, { positionDrop })
    return {
      status: 'HEALTHY',
      shouldAlert: false,
      message: `Rankings ${direction} by ${Math.abs(positionDrop)} position(s) - still healthy`,
      previousStatus,
    }
  }

  logger.info('Content is HEALTHY (stable)')
  return {
    status: 'HEALTHY',
    shouldAlert: false,
    message: 'Rankings stable - no changes',
    previousStatus,
  }
}

/**
 * Calculate priority score for content refresh
 * Higher score = more urgent to fix
 */
export function calculatePriorityScore(
  currentPosition: number | null,
  highestPosition: number | null,
  searchVolume: number | null,
  daysSincePublished: number
): number {
  if (!currentPosition) return 0

  // Traffic potential (0-1 scale)
  const volume = searchVolume || 100 // Default to 100 if unknown
  const ctr = getExpectedCTR(currentPosition)
  const trafficPotential = (volume * ctr) / 1000 // Normalize

  // Position drop severity (0-1 scale)
  const dropSeverity = highestPosition
    ? Math.min((currentPosition - highestPosition) / currentPosition, 1)
    : 0

  // Content age factor (0-1 scale)
  const ageFactor = Math.min(daysSincePublished / 365, 1)

  // Calculate weighted score
  const score =
    trafficPotential * 0.4 + dropSeverity * 0.3 + ageFactor * 0.2 + 0.1

  return Math.round(score * 100)
}

/**
 * Get expected CTR based on position (industry averages)
 */
function getExpectedCTR(position: number): number {
  const ctrMap: Record<number, number> = {
    1: 0.316,
    2: 0.158,
    3: 0.11,
    4: 0.08,
    5: 0.065,
    6: 0.052,
    7: 0.042,
    8: 0.035,
    9: 0.03,
    10: 0.025,
  }

  return ctrMap[position] || (position <= 20 ? 0.01 : 0.005)
}
