
# Bulk Ad Creation for Adwords

Adwords Scripts that uses a Google Spreadsheet URL as the source to create ETAs.

## Usage Steps

**1.** Make a copy of the file below and rename it. 

``https://docs.google.com/spreadsheets/d/1ypXLuFWiaNZUHkcX8cjTkpHI2MAM-hOeBmgkjyDRfqY/edit``

Fill out fields with your creatives in **``Preview``** sheet. Make sure character limits of ad parts are not exceeded as indicated by color change in the corresponding cell to be red.

In **``Source Info``** sheet, insert client ID for the Adwords account to which ads are going to be uploaded in cell **``B1``**.

One should not change the names of the sheets in the template file.

**2.** Copy and paste **``script.js``** to your MCC.

**3.** Insert the copied spreadsheet URL:

```javascript
  function main() {
    var sheetURL = "INSERT_SPREADSHEET_URL_"
    var spreadSheetData = readSpreadsheet(sheetURL)
    if (!spreadSheetData) {
      Logger.log('Something is wrong with the source file.')
      return;
    }
    ...
```

**4.** Save, authorize and preview!

Note that making sure to preview the script before running it is important! Take care to check logs and changes after executing the script in preview mode.

This script ignores and skips any ad if any field exceeds the limits. Number of skipped ads are logged in the console so you can check if not done before the execution.

Needs to be run in the MCC account.

:open_hands: :hand: :open_hands:
