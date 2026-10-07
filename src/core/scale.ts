import { scaleTime, type ScaleTime } from 'd3-scale'
import { timeDay, timeHour, timeMinute, timeMonth, timeSecond, timeWeek, timeYear } from 'd3-time'
import { timeFormat } from 'd3-time-format'
import type { TimelineItem } from './types'

const formatMillisecond = timeFormat('.%L')
const formatSecond = timeFormat(':%S')
const formatMinute = timeFormat('%H:%M')
const formatHour = timeFormat('%H:%M')
const formatDay = timeFormat('%a %d')
const formatWeek = timeFormat('%b %d')
const formatMonth = timeFormat('%B')
const formatYear = timeFormat('%Y')

interface TickFormats {
  millisecond: (date: Date) => string
  second: (date: Date) => string
  minute: (date: Date) => string
  hour: (date: Date) => string
  day: (date: Date) => string
  week: (date: Date) => string
  month: (date: Date) => string
  year: (date: Date) => string
}

export const cascadingTickFormat =
  (formats: TickFormats) =>
  (date: Date): string => {
    if (timeSecond(date) < date) return formats.millisecond(date)
    if (timeMinute(date) < date) return formats.second(date)
    if (timeHour(date) < date) return formats.minute(date)
    if (timeDay(date) < date) return formats.hour(date)
    if (timeMonth(date) < date)
      return timeWeek(date) < date ? formats.day(date) : formats.week(date)
    if (timeYear(date) < date) return formats.month(date)
    return formats.year(date)
  }

export const defaultTickFormat = cascadingTickFormat({
  millisecond: formatMillisecond,
  second: formatSecond,
  minute: formatMinute,
  hour: formatHour,
  day: formatDay,
  week: formatWeek,
  month: formatMonth,
  year: formatYear,
})

export const isoTickFormat = cascadingTickFormat({
  millisecond: formatMillisecond,
  second: formatSecond,
  minute: formatMinute,
  hour: formatHour,
  day: timeFormat('%m-%d'),
  week: timeFormat('%m-%d'),
  month: timeFormat('%Y-%m'),
  year: formatYear,
})

const DAY = 86_400_000
export const DEFAULT_TICK_SPACING = 120

export const tickCount = (plotWidth: number, spacing = DEFAULT_TICK_SPACING): number =>
  Math.max(2, Math.floor(plotWidth / spacing))

const PADDING = 0.05

export const createBaseScale = (domain: [Date, Date], width: number): ScaleTime<number, number> =>
  scaleTime().domain(domain).range([0, width])

export const defaultDomain = (items: TimelineItem[]): [Date, Date] => {
  if (items.length === 0) {
    const now = Date.now()
    return [new Date(now - DAY), new Date(now + DAY)]
  }
  let min = Infinity
  let max = -Infinity
  for (const item of items) {
    min = Math.min(min, item.start.getTime())
    max = Math.max(max, item.end.getTime())
  }
  const span = Math.max(max - min, DAY)
  return [new Date(min - span * PADDING), new Date(max + span * PADDING)]
}
