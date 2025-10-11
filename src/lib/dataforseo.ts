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
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD

  if (!login || !password) {
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
      throw new Error(`DataForSEO API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status_code !== 20000) {
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

        results.push({
          keyword,
          position: position >= 0 ? position + 1 : null,
          url: domain,
        })
      } else {
        // No results found
        results.push({
          keyword,
          position: null,
          url: domain,
        })
      }
    }

    return results
  } catch (error) {
    console.error('Error checking rankings:', error)
    throw error
  }
}
