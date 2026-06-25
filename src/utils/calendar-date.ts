const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const SLASH_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const THAILAND_TIME_ZONE = 'Asia/Bangkok';

type CalendarDateParts = {
  year: string;
  month: string;
  day: string;
};

function padDatePart(value: string | number) {
  return `${value}`.padStart(2, '0');
}

function getBangkokDateParts(date: Date): CalendarDateParts | null {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: THAILAND_TIME_ZONE,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return year && month && day ? { year, month, day } : null;
}

export function normalizeCalendarDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const trimmedValue = value.trim();
  const dateOnlyMatch = trimmedValue.match(CALENDAR_DATE_PATTERN);

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const slashDateMatch = trimmedValue.match(SLASH_DATE_PATTERN);

  if (slashDateMatch) {
    return `${slashDateMatch[3]}-${padDatePart(slashDateMatch[2])}-${padDatePart(slashDateMatch[1])}`;
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const parts = getBangkokDateParts(parsedDate);

  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

export function getTodayCalendarDate() {
  const parts = getBangkokDateParts(new Date());

  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

export function getCalendarDateTimestamp(value: unknown) {
  const normalizedDate = normalizeCalendarDate(value);

  if (!normalizedDate) {
    return Number.NaN;
  }

  const [year, month, day] = normalizedDate.split('-').map(Number);

  return Date.UTC(year, month - 1, day);
}

export function formatThaiCalendarDate(
  value: unknown,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
) {
  const normalizedDate = normalizeCalendarDate(value);

  if (!normalizedDate) {
    return '';
  }

  const [year, month, day] = normalizedDate.split('-').map(Number);
  const displayDate = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat('th-TH', {
    ...options,
    timeZone: THAILAND_TIME_ZONE,
  }).format(displayDate);
}

export function isSameOrAfterCalendarDate(value: unknown, compareValue: unknown) {
  const normalizedDate = normalizeCalendarDate(value);
  const normalizedCompareDate = normalizeCalendarDate(compareValue);

  return !!normalizedDate && !!normalizedCompareDate && normalizedDate >= normalizedCompareDate;
}
