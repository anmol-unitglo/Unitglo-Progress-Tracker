import { formatInTimeZone, toDate, toZonedTime } from 'date-fns-tz';
import { differenceInDays } from 'date-fns';

export const IST_TIMEZONE = 'Asia/Kolkata';

// Backward compatibility
export function getNow(): Date {
  return new Date();
}

export function formatInIST(date: Date | string, formatString: string = "MMM d, yyyy h:mm a"): string {
  if (!date) return "-";
  return formatInTimeZone(new Date(date), IST_TIMEZONE, formatString);
}

// Get current date/time in IST for business logic calculations
export function getISTDate(): Date {
  return new Date();
}

export function formatIST(date: Date, formatStr: string): string {
  return formatInTimeZone(date, IST_TIMEZONE, formatStr);
}

// Convert a UTC date to the start of the day in IST (00:00:00 IST),
// but return it as a Date object (which may log differently in UTC, but represents IST midnight).
export function startOfDayIST(date: Date | string | number): Date {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const dateString = formatInTimeZone(d, IST_TIMEZONE, 'yyyy-MM-dd');
  return toDate(`${dateString}T00:00:00.000`, { timeZone: IST_TIMEZONE });
}

export function endOfDayIST(date: Date | string | number): Date {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const dateString = formatInTimeZone(d, IST_TIMEZONE, 'yyyy-MM-dd');
  return toDate(`${dateString}T23:59:59.999`, { timeZone: IST_TIMEZONE });
}

export function isPastIST(date: Date): boolean {
  const nowISTString = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
  const nowIST = new Date(nowISTString);
  return date < nowIST;
}

export function calculateOverdue(expectedDelivery: Date | null): number | null {
  if (!expectedDelivery) return null;
  const now = new Date();
  if (now > expectedDelivery) {
    const zonedNow = toZonedTime(now, IST_TIMEZONE);
    const zonedExpected = toZonedTime(expectedDelivery, IST_TIMEZONE);
    return differenceInDays(zonedNow, zonedExpected);
  }
  return 0;
}
