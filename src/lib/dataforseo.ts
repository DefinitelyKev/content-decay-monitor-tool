import { logger } from './logger'

interface RankingResult {
  keyword: string
  position: number | null
  url: string
}

export async function checkRankings(
  domain: string,
  keywords: string[],
  locationCode: number = 2840 // United States by default
): Promise<RankingResult[]> {
  logger.rankCheck('Starting rank check', { domain, keywords, locationCode })

  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD

  if (!login || !password) {
    logger.error('DataForSEO credentials not configured')
    throw new Error('DataForSEO credentials not configured')
  }

  const auth = Buffer.from(`${login}:${password}`).toString('base64')

  const tasks = keywords.map((keyword) => ({
    language_code: 'en',
    location_code: locationCode,
    keyword,
    device: 'desktop',
    os: 'windows',
  }))

  try {
    logger.info('Sending request to DataForSEO API', { taskCount: tasks.length })

    const response = await fetch(
      'https://api.dataforseo.com/v3/serp/google/organic/live/advanced',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tasks),
      }
    )

    if (!response.ok) {
      logger.error('DataForSEO API HTTP error', { status: response.status, statusText: response.statusText })
      throw new Error(`DataForSEO API error: ${response.statusText}`)
    }

    const data = await response.json()
    logger.debug('DataForSEO API response received', { statusCode: data.status_code })

    if (data.status_code !== 20000) {
      logger.error('DataForSEO API returned error', { statusCode: data.status_code, message: data.status_message })
      throw new Error(`DataForSEO error: ${data.status_message}`)
    }

    const results: RankingResult[] = []

    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i]
      const keyword = keywords[i]

      if (task.result?.[0]?.items) {
        // Find position of domain in SERP results
        const position = task.result[0].items.findIndex(
          (item: any) =>
            item.domain &&
            (item.domain === domain ||
              item.domain === domain.replace('www.', '') ||
              item.domain === `www.${domain}`)
        )

        const finalPosition = position >= 0 ? position + 1 : null
        logger.rankCheck(`Keyword "${keyword}" - Position: ${finalPosition || 'Not found'}`)

        results.push({
          keyword,
          position: finalPosition,
          url: domain,
        })
      } else {
        logger.warn(`No results found for keyword: ${keyword}`)
        // No results found
        results.push({
          keyword,
          position: null,
          url: domain,
        })
      }
    }

    logger.success('Rank check completed', { resultsCount: results.length })
    return results
  } catch (error) {
    logger.error('Error checking rankings', error)
    throw error
  }
}
