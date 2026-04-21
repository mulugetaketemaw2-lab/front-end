/**
 * Utility for exporting member data to various formats and printing.
 */

/**
 * Exports JSON data to CSV format and triggers a download.
 * @param {Array} data - The array of member objects.
 * @param {string} filename - The desired filename.
 */
export const exportToCSV = (data, filename = 'members_report.csv') => {
  if (!data || data.length === 0) return;

  const headers = [
    'First Name', 'Father Name', 'Grandfather Name', 'Christian Name', 'Spiritual Father',
    'Gender', 'Student ID', 'University', 'Department', 'Batch', 'Term',
    'Ordination', 'Service Department', 'Region', 'Zone', 'Woreda', 'Kebele',
    'Phone', 'Email', 'Fellowship ID', 'Sunday School Served', 'Status'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = [
      `"${item.firstName || ''}"`,
      `"${item.fatherName || ''}"`,
      `"${item.grandFatherName || ''}"`,
      `"${item.christianName || ''}"`,
      `"${item.spiritualFather || ''}"`,
      `"${item.gender || ''}"`,
      `"${item.studentId || ''}"`,
      `"${item.university || 'Wollo University'}"`,
      `"${item.department || ''}"`,
      `"${item.batch || ''}"`,
      `"${item.term || ''}"`,
      `"${item.ordination || 'የለም'}"`,
      `"${item.serviceDepartment || ''}"`,
      `"${item.region || ''}"`,
      `"${item.zone || ''}"`,
      `"${item.woreda || ''}"`,
      `"${item.kebele || ''}"`,
      `"${item.phone || ''}"`,
      `"${item.email || ''}"`,
      `"${item.fellowshipId || ''}"`,
      `"${item.isSundaySchoolServed === 'አገለግላለሁ' ? 'አገልግያለሁ' : (item.isSundaySchoolServed === 'አላገለግልም' ? 'አላገለገልኩም' : (item.isSundaySchoolServed || 'አላገለገልኩም'))}"`,
      `"${item.isApproved ? 'Approved' : 'Pending'}"`
    ];
    csvRows.push(row.join(','));
  });

  // Add UTF-8 BOM (\uFEFF) for Excel compatibility with Amharic characters
  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Triggers Excel download (using CSV with .xls extension as a standard trick).
 */
export const exportToExcel = (data, filename = 'members_report.xls') => {
  exportToCSV(data, filename);
};

/**
 * Exports financial transactions to CSV format.
 */
export const exportFinanceToCSV = (data, filename = 'finance_report.csv') => {
  if (!data || data.length === 0) return;

  const headers = [
    'ቀን (Date)', 
    'ዓይነት (Type)', 
    'መግለጫ (Description)', 
    'ምድብ (Category)', 
    'መጠን (Amount)', 
    'ክፍል (Dept)', 
    'ሁኔታ (Status)'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = [
      `"${item.date?.split('T')[0] || ''}"`,
      `"${item.type === 'income' ? 'ገቢ' : 'ወጭ'}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${item.category || ''}"`,
      `"${item.amount || 0}"`,
      `"${item.department || ''}"`,
      `"${item.status || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Trigger Excel download for finance data.
 */
export const exportFinanceToExcel = (data, filename = 'finance_report.xls') => {
  exportFinanceToCSV(data, filename);
};

/**
 * Triggers the browser print dialog for the "Book Form" container.
 */
export const printBookForm = () => {
    window.print();
};

/**
 * Exports Deacons data to Excel (CSV format).
 */
export const exportDeaconsToExcel = (data, filename = 'deacons_report.xls') => {
  if (!data || data.length === 0) return;

  const headers = [
    'ስም (Name)', 
    'የተማሪ ID (Student ID)', 
    'ስልክ (Phone)', 
    'ዲፓርትመንት (Dept)', 
    'ባች (Batch)', 
    'ጾታ (Gender)', 
    'የሚማሩት (Field)', 
    'ሁኔታ (Status)', 
    'ክልል (Region)', 
    'ዞን (Zone)', 
    'ወረዳ (Woreda)', 
    'ቀበሌ (Kebele)'
  ];

  const csvRows = [headers.join(',')];

  data.forEach(item => {
    const row = [
      `"${item.name || ''}"`,
      `"${item.studentId || ''}"`,
      `"${item.phone || ''}"`,
      `"${item.department || ''}"`,
      `"${item.batch || ''}"`,
      `"${item.gender || ''}"`,
      `"${item.studyField === 'ሌላ' ? item.studyFieldOther : item.studyField}"`,
      `"${item.deaconshipStatus || ''}"`,
      `"${item.region || ''}"`,
      `"${item.zone || ''}"`,
      `"${item.woreda || ''}"`,
      `"${item.kebele || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  const csvString = '\uFEFF' + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
