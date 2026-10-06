export function formatReportDate(value: string | null) {
  if (!value) return null
  const calendarDate = /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value) ? value.slice(0, 10) : null
  if (!calendarDate) return null

  const calendar = new Date(`${calendarDate}T12:00:00Z`)
  if (Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== calendarDate) return null

  const isDateOnly = value === calendarDate
  const date = isDateOnly ? calendar : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  // Date-only API values are calendar dates, so preserve their day when formatting.
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", timeZone: isDateOnly ? "UTC" : "America/Bahia",
  }).formatToParts(date)
  const day = parts.find((part) => part.type === "day")?.value
  const month = parts.find((part) => part.type === "month")?.value.replace(/\.$/, "") ?? ""
  const year = parts.find((part) => part.type === "year")?.value
  return `${day} ${month.charAt(0).toLocaleUpperCase("pt-BR")}${month.slice(1)} ${year}`
}

export function safeReportHref(value: string | undefined) {
  if (!value || value !== value.trim() || value.includes("\\")) return undefined
  if (Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return undefined
  if (value.startsWith("/") && !value.startsWith("//")) return value
  if (!/^https?:\/\//i.test(value)) return undefined
  try {
    const url = new URL(value)
    return url.username || url.password ? undefined : url.href
  } catch {
    return undefined
  }
}
