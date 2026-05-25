# Google Sheets Integration Setup Guide

Follow these steps to connect your website to your Google Sheet:

## 1. Prepare Your Google Sheet
1. Open your sheet: https://docs.google.com/spreadsheets/d/1iuroE9vS6bvfAUALEXsHus-KP6qL3TNJIXiw_4ShMdM
2. Set up the header row (Row 1) with the following headers in columns A through D:
   - **Column A**: `Date`
   - **Column B**: `Title`
   - **Column C**: `Description`
   - **Column D**: `Status`
3. Enter your current attempts as starting rows:
   - Row 2: `12 March 2026 // LEO-SYNC-01` | `Helios-Target Alpha` | `Initial targeting window test targeting LEO reflector array...` | `completed`
   - Row 3: `28 April 2026 // LEO-SYNC-02` | `LEO Reflect-Sync` | `Refined step-motor calibration. Tracking window: 18 seconds...` | `completed`
   - Row 4: `18 May 2026 // EQ-MERIDIAN-01` | `Equatorial Meridian Test` | `Targeting satellite transit along the local meridian...` | `completed`
   - Row 5: `04 June 2026 // SCHEDULED MISSION` | `Helios-Sync Beta` | `Next scheduled transit sync. Objective: Establish continuous reflection link...` | `scheduled`

## 2. Add the Apps Script Code
1. Click **Extensions** > **Apps Script** from the top menu of your Google Sheet.
2. Replace all code in `Code.gs` with the script below:

```javascript
function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var rows = [];
    
    // Convert sheet rows into JSON objects (skip header Row 1)
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] !== "") {
        rows.push({
          date: data[i][0],
          title: data[i][1],
          description: data[i][2],
          status: data[i][3]
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(rows))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var date, title, description, status;
    
    // Parse input fields from POST payload
    if (e.postData && e.postData.contents) {
      try {
        var params = JSON.parse(e.postData.contents);
        date = params.date;
        title = params.title;
        description = params.description;
        status = params.status;
      } catch (parseError) {
        date = e.parameter.date;
        title = e.parameter.title;
        description = e.parameter.description;
        status = e.parameter.status;
      }
    } else {
      date = e.parameter.date;
      title = e.parameter.title;
      description = e.parameter.description;
      status = e.parameter.status;
    }
    
    if (!date || !title || !description) {
      throw new Error("Missing required fields: date, title, description");
    }
    
    sheet.appendRow([date, title, description, status || 'scheduled']);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. Click the **Save** (disk icon) button at the top of the editor.

## 3. Deploy the Web App
1. Click the blue **Deploy** button at the top right, then select **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the fields:
   - **Description**: `Heliography Log Sync API`
   - **Execute as**: **Me (your-email@gmail.com)**
   - **Who has access**: **Anyone** (This is required so the website can fetch logs anonymously, but it will only execute the specific actions defined in your script).
4. Click **Deploy**.
5. Copy the **Web app URL** provided in the success box (it starts with `https://script.google.com/macros/s/.../exec`).

## 4. Bind the URL to the Website
1. Open [js/main.js](file:///C:/Users/izawa/.gemini/antigravity/scratch/orbital_heliography/js/main.js)
2. Paste the Web App URL inside the quotes of `GOOGLE_SHEETS_API_URL` at the top of the file:
   ```javascript
   const GOOGLE_SHEETS_API_URL = 'YOUR_COPIED_URL_HERE';
   ```
3. Commit and push the changes to GitHub, and your logs will be live and synced with the spreadsheet!
