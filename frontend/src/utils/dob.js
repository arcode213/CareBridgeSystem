/**
 * Shared date-of-birth helpers. DOB is the single source of truth for a
 * patient's age across the app; `age` is always derived from it so the Day /
 * Month / Year combo boxes stay consistent everywhere they are used.
 */

export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

/** Years from the current year back `maxAge` years (newest first). */
export function yearOptions(maxAge = 120) {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= current - maxAge; y--) years.push(y);
  return years;
}

/**
 * Build an ISO 'YYYY-MM-DD' string from { day, month, year } parts.
 * Returns '' when incomplete or invalid (e.g. 31 February).
 */
export function partsToIso({ day, month, year }) {
  if (!day || !month || !year) return '';
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return '';
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Split an ISO string / Date into { day, month, year } strings ('' when absent). */
export function isoToParts(dob) {
  if (!dob) return { day: '', month: '', year: '' };
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return { day: '', month: '', year: '' };
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear()),
  };
}

/** Elapsed age split into { years, months, days }, or null when missing/invalid. */
export function ageParts(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  if (birth.getTime() > now.getTime()) return null;

  let years = now.getUTCFullYear() - birth.getUTCFullYear();
  let months = now.getUTCMonth() - birth.getUTCMonth();
  let days = now.getUTCDate() - birth.getUTCDate();

  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/**
 * Human-friendly age that adapts its unit: days under a month, months under a
 * year, otherwise years. e.g. "5 days", "3 months", "2 years". '' when invalid.
 */
export function formatAge(dob) {
  const parts = ageParts(dob);
  if (!parts) return '';
  if (parts.years >= 1) return parts.years === 1 ? '1 year' : `${parts.years} years`;
  if (parts.months >= 1) return parts.months === 1 ? '1 month' : `${parts.months} months`;
  return parts.days === 1 ? '1 day' : `${parts.days} days`;
}

/**
 * Age label for a referral-like record: prefers DOB (days/months/years), and
 * falls back to the stored numeric age in years for legacy records.
 */
export function ageLabel(record) {
  if (!record) return '';
  const fromDob = formatAge(record.dateOfBirth);
  if (fromDob) return fromDob;
  return record.age != null && record.age !== '' ? `${record.age} years` : '';
}

/** Whole-year age from a DOB (ISO string or Date). Returns '' when missing/invalid. */
export function ageFromDob(dob) {
  if (!dob) return '';
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < date.getUTCDate())) {
    age--;
  }
  return age >= 0 && age <= 150 ? age : '';
}

/** Human-friendly label such as "15 Jan 1990". Returns '' when missing/invalid. */
export function formatDob(dob) {
  if (!dob) return '';
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCDate()} ${MONTH_ABBR[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
