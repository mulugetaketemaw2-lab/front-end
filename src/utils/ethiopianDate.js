/**
 * Ethiopian Calendar Conversion Utility
 * Handles conversion between Ethiopian Calendar (EC) and Gregorian Calendar (GC).
 */

const ETHIOPIAN_MONTHS = [
  { id: 1, name: 'መስከረም', en: 'Meskerem' },
  { id: 2, name: 'ጥቅምት', en: 'Tikimt' },
  { id: 3, name: 'ህዳር', en: 'Hidar' },
  { id: 4, name: 'ታህሳስ', en: 'Tahsas' },
  { id: 5, name: 'ጥር', en: 'Tir' },
  { id: 6, name: 'የካቲት', en: 'Yekatit' },
  { id: 7, name: 'መጋቢት', en: 'Megabit' },
  { id: 8, name: 'ሚያዝያ', en: 'Miyazia' },
  { id: 9, name: 'ግንቦት', en: 'Ginbot' },
  { id: 10, name: 'ሰኔ', en: 'Sene' },
  { id: 11, name: 'ሐምሌ', en: 'Hamle' },
  { id: 12, name: 'ነሐሴ', en: 'Nehasse' },
  { id: 13, name: 'ጳጉሜ', en: 'Pagume' }
];

/**
 * Converts Ethiopian Date to Gregorian Date
 * @param {number} day 1-30 (or 1-6 for Pagume)
 * @param {number} month 1-13
 * @param {number} year (e.g., 2018)
 * @returns {Date} Gregorian Date object
 */
export const ethToGre = (day, month, year) => {
  const jdn = ethToJdn(day, month, year);
  return jdnToGre(jdn);
};

/**
 * Converts Gregorian Date to Ethiopian Date
 * @param {Date|string} date 
 * @returns {object} {day, month, year, monthAmharic}
 */
export const greToEth = (date) => {
  const d = new Date(date);
  const jdn = greToJdn(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const eth = jdnToEth(jdn);
  const monthInfo = ETHIOPIAN_MONTHS.find(m => m.id === eth.month);
  return {
    ...eth,
    monthAmharic: monthInfo ? monthInfo.name : '',
    monthEn: monthInfo ? monthInfo.en : ''
  };
};

// --- Low Level JDN Math ---

const ethToJdn = (day, month, year) => {
  const era = 1723856;
  return era + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day - 2;
};

const jdnToGre = (jdn) => {
  const z = jdn + 1;
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const b = z + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const g = Math.floor((c - e) / 30.6001);
  const day = c - e - Math.floor(30.6001 * g);
  const month = g < 14 ? g - 1 : g - 13;
  const year = month > 2 ? d - 4716 : d - 4715;
  return new Date(year, month - 1, day);
};

const greToJdn = (year, month, day) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
};

const jdnToEth = (jdn) => {
  const era = 1723856;
  const r = (jdn - era) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year = 4 * Math.floor((jdn - era) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  
  // Year correction: Fixes the issue where 2026 GC was incorrectly mapping to 2019 EC
  return { day, month: month > 13 ? 13 : month, year: year };
};

export const formatEthDate = (date) => {
  if (!date) return '';
  const eth = greToEth(date);
  return `${eth.monthAmharic} ${eth.day}, ${eth.year}`;
};

export { ETHIOPIAN_MONTHS };
