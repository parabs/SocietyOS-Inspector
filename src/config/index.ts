/**
 * Central Configuration for Varsha Nivas Society Financial Management
 */

export const APP_CONFIG = {
  societyName: "Pearl Meadows 'C' Type 'C' Wing Chs Ltd",
  societySubtitle: 'Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014',
  registrationNo: 'TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014',
  financialYear: '2018 - 2019',
  periodDisplay: '01 Apr 2018 – 31 Mar 2019',
  currentReviewer: {
    name: 'Sachin Parab',
    role: 'Treasurer (Verification)',
    initials: 'SP',
    email: 'parab.sachin@gmail.com',
  },
  lastUpdated: '20 Oct 2026, 04:15 PM',
  accounts: [
    {
      id: 'TDCC',
      name: 'Bank - TDCC (Main A/c)',
      shortName: 'TDCC (Main A/c)',
      type: 'Bank',
      currentBalance: 569980,
    },
    {
      id: 'BOM',
      name: 'Bank - BOM (Secondary A/c)',
      shortName: 'BOM (Secondary A/c)',
      type: 'Bank',
      currentBalance: 324200,
    },
    {
      id: 'CASH',
      name: 'Cash (Petty Cash)',
      shortName: 'Cash (Petty Cash)',
      type: 'Cash',
      currentBalance: 21800,
    },
  ] as const,
  months: [
    'Apr 2018',
    'May 2018',
    'Jun 2018',
    'Jul 2018',
    'Aug 2018',
    'Sep 2018',
    'Oct 2018',
    'Nov 2018',
    'Dec 2018',
    'Jan 2019',
    'Feb 2019',
    'Mar 2019',
  ] as const,
  backend: {
    // Google Apps Script Web App Deployment URL
    apiUrl: import.meta.env.VITE_GAS_API_URL || '',
    // Google Sheets ID
    spreadsheetId: import.meta.env.VITE_GOOGLE_SHEET_ID || '',
    // Original Drive Folder ID
    driveFolderId: import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '',
    // Tolerance for discrepancies in INR (Zero tolerance by default)
    toleranceThreshold: 0,
  },
};

/**
 * Format Indian Rupee currency with standard Indian grouping (e.g. ₹ 5,69,980)
 */
export function formatINR(val: number | undefined | null, showSign = false): string {
  if (val === undefined || val === null || isNaN(val)) return '₹ 0';
  const isNeg = val < 0;
  const abs = Math.abs(val);

  // Format with en-IN
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(abs);

  if (showSign && val > 0) {
    return `+₹ ${formatted}`;
  }
  return isNeg ? `-₹ ${formatted}` : `₹ ${formatted}`;
}

export function formatNumber(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN').format(val);
}
