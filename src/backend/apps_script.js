/**
 * Google Apps Script Backend Code for Varsha Nivas Financial Verification
 * Deploy this script as a Web App in Google Apps Script editor.
 * Execution: Runs as web app owner or user accessing web app.
 * Access: Restricted to authorised society reviewers (@gmail.com accounts).
 */

const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  const action = e.parameter.action;
  let result = {};

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === "getOpeningBalances") {
      result = getOpeningBalancesFromSheet(ss);
    } else if (action === "getMonthlyReconciliations") {
      result = getMonthlyReconciliationsFromSheet(ss, e.parameter.accountId);
    } else {
      result = { success: false, error: "Invalid action" };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST Requests (Audit writes & inspections)
 */
function doPost(e) {
  let result = {};

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;
    const userEmail = Session.getActiveUser().getEmail() || payload.reviewer;

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (action === "saveOpeningBalance") {
      result = saveOpeningBalanceToSheet(ss, payload, userEmail);
    } else if (action === "saveTransactionInspection") {
      result = saveTransactionInspectionToSheet(ss, payload, userEmail);
    } else if (action === "saveMonthlyReconciliation") {
      result = saveMonthlyReconciliationToSheet(ss, payload, userEmail);
    } else {
      result = { success: false, error: "Unknown action" };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOpeningBalancesFromSheet(ss) {
  const sheet = ss.getSheetByName("Opening_Balance_Verification");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    rows.push({
      accountId: r[0],
      accountName: r[1],
      auditClosingBalance: Number(r[2]),
      recordedOpeningBalance: Number(r[3]),
      difference: Number(r[4]),
      supportingRecords: {
        auditReport: Boolean(r[5]),
        cashBook: Boolean(r[6]),
        bankPassbook: Boolean(r[7]),
      },
      status: r[8],
      remarks: r[9],
      verifiedBy: r[10],
      verifiedOn: r[11],
    });
  }
  return { success: true, data: rows };
}

function saveTransactionInspectionToSheet(ss, payload, userEmail) {
  const inspectionSheet = ss.getSheetByName("Transaction_Inspections");
  const logSheet = ss.getSheetByName("Change_Log");

  // Record or update inspection row
  inspectionSheet.appendRow([
    payload.transactionId,
    payload.billStatus,
    payload.voucherReceiptStatus,
    payload.internalAuditStatus,
    payload.remarks,
    userEmail,
    new Date(),
  ]);

  // Append to Change Log
  logSheet.appendRow([
    "LOG-" + new Date().getTime(),
    "Transaction",
    payload.transactionId,
    "Saved Inspection (" + payload.billStatus + "/" + payload.voucherReceiptStatus + ")",
    userEmail,
    new Date(),
    payload.remarks,
  ]);

  return { success: true };
}
