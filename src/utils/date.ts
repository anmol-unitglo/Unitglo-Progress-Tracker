import { format, differenceInDays } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Returns the current date/time without shifting the underlying JS Date,
 * but can be used for explicit timezone comparisons if needed.
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Formats a given date consistently in the configured timezone.
 */
export function formatInIST(date: Date | string, formatString: string = "MMM d, yyyy h:mm a"): string {
  if (!date) return "-";
  return formatInTimeZone(new Date(date), DEFAULT_TIMEZONE, formatString);
}

/**
 * Calculates current overdue days if the expected delivery is past the current time.
 * If expectedDelivery is in the future, returns 0.
 * If expectedDelivery is null, returns null.
 */
export function calculateOverdue(expectedDelivery: Date | null): number | null {
  if (!expectedDelivery) return null;
  const now = getNow();
  if (now > expectedDelivery) {
    const zonedNow = toZonedTime(now, DEFAULT_TIMEZONE);
    const zonedExpected = toZonedTime(expectedDelivery, DEFAULT_TIMEZONE);
    return differenceInDays(zonedNow, zonedExpected);
  }
  return 0;
}
