const SPREADSHEET_ID = "12PIwWiPcgKz9PMfS8mempyl9tsUNEP23VYOC5nx2OG0";

const SHEET_CONFIG = {
  restaurant_partners: [
    "Timestamp", "Owner Name", "Mobile", "WhatsApp", "Email",
    "Restaurant Name", "Restaurant Type", "State", "District", "City",
    "Locality", "Landmark", "Full Address", "Pincode", "Latitude",
    "Longitude", "Primary Locality", "Additional Localities",
    "Delivery Radius", "FSSAI Number", "Number of Branches",
    "Average Daily Orders", "Additional Notes", "Status"
  ],
  delivery_partners: [
    "Timestamp", "Full Name", "Mobile", "WhatsApp", "Email",
    "State", "District", "City", "Locality", "Landmark", "Pincode",
    "Vehicle Type", "Availability", "Working Model", "Salary Preference",
    "Expected Income", "Latitude", "Longitude", "Preferred Working Areas",
    "Max Travel Distance", "Status"
  ],
  careers: [
    "Timestamp", "Full Name", "Mobile", "WhatsApp", "Email",
    "Qualification", "Experience", "Current Company", "Current Salary",
    "Expected Salary", "State", "District", "City", "Locality",
    "Position Applying For", "Preferred Location", "Resume Link",
    "Portfolio Link", "LinkedIn Profile", "Portfolio Website",
    "Cover Letter", "Status"
  ],
  contact_leads: [
    "Timestamp", "Name", "Email", "Mobile", "Subject", "Message", "Status"
  ]
};

function ensureSheet(sheetName, headers) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  if (e.parameter.admin === "true") {
    return HtmlService.createHtmlOutputFromFile("admin").setTitle("LocalWala Admin");
  }
  return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
}

function getSheetData(sheetKey) {
  if (!SHEET_CONFIG[sheetKey]) {
    throw new Error("Invalid sheet: " + sheetKey);
  }
  var headers = SHEET_CONFIG[sheetKey];
  var sheet = ensureSheet(sheetKey, headers);
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] != null ? row[j] : "";
    }
    result.push(obj);
  }
  return result;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return jsonResponse({ success: false, error: "Server busy, please retry" });
  }

  try {
    var rawBody = e.postData.contents;
    if (!rawBody) {
      return jsonResponse({ success: false, error: "Empty request body" });
    }

    var body = JSON.parse(rawBody);
    var sheetKey = body.sheet;

    if (!sheetKey || !SHEET_CONFIG[sheetKey]) {
      return jsonResponse({ success: false, error: "Invalid or missing sheet parameter" });
    }

    var headers = SHEET_CONFIG[sheetKey];
    var sheet = ensureSheet(sheetKey, headers);

    var row = headers.map(function(header) {
      var field = header.toLowerCase().replace(/\s+/g, "_");
      return body[field] !== undefined ? body[field] : "";
    });

    sheet.appendRow(row);

    return jsonResponse({ success: true, message: "Data saved successfully" });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function doOptions(e) {
  return jsonResponse({});
}

function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
