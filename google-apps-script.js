/**
 * ==============================================================================
 * ATOMAKER FEEDBACK - UNIFIED GOOGLE APPS SCRIPT WEB APP
 * ==============================================================================
 * 
 * This script provides a single unified endpoint for Atomaker feedback:
 *  - POST (Receive): Appends new feedback submissions as rows to your Google Sheet
 *                    and sends an email notification to the site owner.
 *  - GET  (Fetch):   Fetches all feedback submissions from your Google Sheet as JSON
 *                    so they can be viewed live in the feedback archive dashboard.
 * 
 * ------------------------------------------------------------------------------
 * SETUP & DEPLOYMENT INSTRUCTIONS (Takes ~2 minutes):
 * ------------------------------------------------------------------------------
 * 1. Open Google Sheets (https://sheets.new) and name the spreadsheet (e.g. "Atomaker Feedback").
 * 2. In the top menu, click Extensions > Apps Script.
 * 3. Delete any code currently in the editor and paste this entire file's code.
 * 4. (Optional) Check the OWNER_EMAIL constant below (defaults to 9agroup2@npsinr.com).
 * 5. Click the blue 'Deploy' button in the top right -> Choose 'New deployment'.
 * 6. Under 'Select type' (gear icon on the left), select 'Web app'.
 * 7. Fill in the deployment configuration:
 *      - Description: Atomaker Feedback API
 *      - Execute as: Me (your Google account)
 *      - Who has access: Anyone (CRITICAL: Must be "Anyone" so visitors and your site can submit & fetch)
 * 8. Click 'Deploy'. Grant permissions if prompted by Google.
 * 9. Copy the generated 'Web app URL' (looks like: https://script.google.com/macros/s/AKfycb.../exec).
 * 10. Open `Atomaker-website-main/feedback.html` and paste your URL into:
 *      const GOOGLE_SCRIPT_URL = "YOUR_COPIED_URL_HERE";
 * ==============================================================================
 */

// Target email address where feedback alerts are sent
var OWNER_EMAIL = "9agroup2@npsinr.com";

/**
 * Handle GET requests: Fetch all feedback items from the Google Sheet
 */
function doGet(e) {
  try {
    var sheet = getOrCreateFeedbackSheet();
    var data = sheet.getDataRange().getValues();

    // If only header row exists (or sheet is empty)
    if (data.length <= 1) {
      return createJsonResponse([]);
    }

    var feedbackList = [];

    // Loop through rows skipping header (row 0)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip empty rows
      if (!row[0] && !row[6]) continue;

      feedbackList.push({
        id: row[0] ? String(row[0]) : ('fb_' + i),
        timestamp: row[1] ? String(row[1]) : '',
        name: row[2] ? String(row[2]) : 'Anonymous',
        email: row[3] ? String(row[3]) : 'Not provided',
        category: row[4] ? String(row[4]) : 'General',
        rating: Number(row[5]) || 5,
        message: row[6] ? String(row[6]) : ''
      });
    }

    // Newest submissions first
    feedbackList.reverse();

    return createJsonResponse(feedbackList);
  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  }
}

/**
 * Handle POST requests: Receive new feedback submission and append to Google Sheet
 */
function doPost(e) {
  try {
    var sheet = getOrCreateFeedbackSheet();
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var id = data.id || ('fb_' + new Date().getTime());
    var timestamp = data.timestamp || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    var name = data.name || 'Anonymous';
    var email = data.email || 'Not provided';
    var category = data.category || 'General';
    var rating = Number(data.rating) || 5;
    var message = data.message || '';

    // Append new row to Google Sheet
    sheet.appendRow([id, timestamp, name, email, category, rating, message]);

    // Send instant email notification to the site owner
    if (OWNER_EMAIL && OWNER_EMAIL.trim()) {
      try {
        MailApp.sendEmail({
          to: OWNER_EMAIL.trim(),
          subject: "New Atomaker Feedback from " + name + " (" + rating + " Stars)",
          body: "You received new feedback on Atomaker!\n\n" +
                "----------------------------------------\n" +
                "Name:      " + name + "\n" +
                "Email:     " + email + "\n" +
                "Topic:     " + category + "\n" +
                "Rating:    " + rating + " / 5 Stars\n" +
                "Submitted: " + timestamp + "\n" +
                "----------------------------------------\n\n" +
                "Message:\n" + message + "\n\n" +
                "--\nSent automatically via Atomaker Google Apps Script"
        });
      } catch (mailErr) {
        Logger.log("Mail delivery error (row was still recorded): " + mailErr);
      }
    }

    return createJsonResponse({ status: "success", id: id });
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Helper: Get active sheet and ensure headers exist
 */
function getOrCreateFeedbackSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "Timestamp", "Name", "Email", "Category", "Rating", "Feedback"]);
    var headerRange = sheet.getRange(1, 1, 1, 7);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#d0c8f0");
  }

  return sheet;
}

/**
 * Helper: Output JSON response with proper CORS headers
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
