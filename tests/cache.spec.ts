import { describe, expect, it } from 'vitest'
import {
  billedInputTokens,
  CACHE_ALARM_MIN_BILLED_INPUT,
  CACHE_DROP_POINTS_THRESHOLD,
  cacheReuse,
  observeCache,
  SURFACE_GROWTH_ALARM_FRACTION,
  SURFACE_GROWTH_ALARM_TOKENS,
  surfaceGrowthAlarm,
} from '../src/cache.ts'
import { usage } from './helpers.ts'

describe('billedInputTokens', () => {
  it('sums uncached input, cache reads, and cache writes', () => {
    expect(billedInputTokens(usage(100, 50, { cacheReadTokens: 800, cacheWriteTokens: 200 }))).toBe(1100)
    expect(billedInputTokens(usage(100, 50))).toBe(100)
  })
})

describe('cacheReuse', () => {
  it('is reads over billed input', () => {
    expect(cacheReuse(usage(100, 50, { cacheReadTokens: 300 }))).toBeCloseTo(0.75)
  })

  it('is undefined when reads are unavailable or billed input is zero', () => {
    expect(cacheReuse(usage(100, 50))).toBeUndefined()
    expect(cacheReuse(usage(0, 0))).toBeUndefined()
  })
})

describe('observeCache', () => {
  it('never flags a drop without usage', () => {
    expect(observeCache(undefined, undefined)).toEqual({ drop: false })
  })

  it('reports billed input but no reuse when reads are unavailable', () => {
    const observation = observeCache(usage(100, 50), usage(100, 50))
    expect(observation).toEqual({ billedInputTokens: 100, drop: false })
  })

  it('flags a drop only across the points threshold on a large previous request', () => {
    const smallDrop = observeCache(
      usage(1000, 100, { cacheReadTokens: 10 }),
      usage(2000, 100, { cacheReadTokens: 1800 }),
    )
    expect(smallDrop.previousReuse).toBeCloseTo(1800 / 3800)
    expect(smallDrop.deltaPoints).toBeCloseTo((10 / 1010 - 1800 / 3800) * 100, 0)
    expect(smallDrop.drop).toBe(true)

    const belowThreshold = observeCache(
      usage(2000, 100, { cacheReadTokens: 700 }),
      usage(2000, 100, { cacheReadTokens: 1000 }),
    )
    expect(belowThreshold.deltaPoints).toBeCloseTo((700 / 2700 - 1000 / 3000) * 100, 0)
    expect(belowThreshold.drop).toBe(false)
  })

  it('never alarms when the previous request was too small to mean anything', () => {
    const tinyPrevious = observeCache(
      usage(1000, 100, { cacheReadTokens: 0 }),
      usage(10, 10, { cacheReadTokens: 9 }),
    )
    expect(tinyPrevious.deltaPoints).toBeCloseTo((0 - 9 / 19) * 100, 0)
    expect(tinyPrevious.drop).toBe(false)
  })

  it('records the delta and previous reuse when both requests reported reads', () => {
    const observation = observeCache(
      usage(500, 100, { cacheReadTokens: 500 }),
      usage(1000, 100, { cacheReadTokens: 1000 }),
    )
    expect(observation.previousReuse).toBeCloseTo(0.5)
    expect(observation.deltaPoints).toBeCloseTo(0)
    expect(observation.drop).toBe(false)
  })

  it('exposes its alarm thresholds as exported constants', () => {
    expect(CACHE_ALARM_MIN_BILLED_INPUT).toBe(1000)
    expect(CACHE_DROP_POINTS_THRESHOLD).toBe(20)
  })
})

describe('surfaceGrowthAlarm', () => {
  it('flags growth at or above the absolute token alarm', () => {
    expect(surfaceGrowthAlarm(undefined, SURFACE_GROWTH_ALARM_TOKENS)).toBe(true)
    expect(surfaceGrowthAlarm(undefined, SURFACE_GROWTH_ALARM_TOKENS - 1)).toBe(false)
  })

  it('flags growth at or above the fraction alarm of the previous billed input', () => {
    const previous = 3000
    expect(surfaceGrowthAlarm(previous, previous * SURFACE_GROWTH_ALARM_FRACTION)).toBe(true)
    expect(surfaceGrowthAlarm(previous, previous * SURFACE_GROWTH_ALARM_FRACTION - 1)).toBe(false)
  })

  it('never flags negative growth', () => {
    expect(surfaceGrowthAlarm(undefined, -1)).toBe(false)
  })
})
