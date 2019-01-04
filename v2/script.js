//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
// Spreadsheet-based script to bulk create ads & keywords.
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function main() {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var sheetURL = "SPREADSHEET_URL"
  var spreadSheetData = readSpreadsheet(sheetURL)
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!spreadSheetData) {
    Logger.log('Something is wrong with the source file.')
    return 'Failure';
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var MccClientID = 'XXX-YYY-ZZZZ'
    , MccClientAccounts = MccApp.accounts().withIds([MccClientID]).get()
    , MccClientAccount = MccClientAccounts.next();
  MccApp.select(MccClientAccount);
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var adGroups = selectAdGroups(spreadSheetData['adGroupIds'])
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Create keywords.
  createKeywords(spreadSheetData, adGroups)
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  // Create responsive search ads.
  createAds(spreadSheetData, adGroups)
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return 'Success';
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function readSpreadsheet(sheetURL) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!sheetURL || sheetURL === '') {
    Logger.log('Please provide a valid spreadsheet URL.');
    return false;
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var spreadsheet = SpreadsheetApp.openByUrl(sheetURL)
    , sheet = spreadsheet.getSheetByName('Sheet1')
    , startRow = 2
    , startColumn = 1
    , endRow = sheet.getLastRow() - 1
    , endColumn = 17
    , rows = sheet.getRange(startRow, startColumn, endRow, endColumn).getValues();

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var data = {}
  var adGroupIds = [];
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  rows.forEach(function(row) {
    var ad = {}, keywords = [], adGroupId = '';
    ad['headlines'] = row.slice(0, 5);
    ad['descriptions'] = row.slice(5, 9);
    ad['paths'] = row.slice(9, 11);
    ad['lp'] = row[11];
    keywords = row.slice(15, 17);
    keywords = keywords.map(function(keyword) {
      keyword = keyword.trim();
      keyword = keyword.split(' ');
      keyword = keyword.map(function(word) {
        return '+' + word
      })
      keyword = keyword.join(' ');
      return keyword;
    })
    adGroupId = row[13];
    adGroupIds.push(adGroupId)
    data[adGroupId] = {}
    data[adGroupId]['ads'] = ad;
    data[adGroupId]['keywords'] = keywords
  })
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  adGroupIds = adGroupIds.filter(function(x, y, z) {
    return z.indexOf(x) === y;
  })
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  data['adGroupIds'] = adGroupIds;
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return data;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function selectAdGroups(adGroupIds) {
  return AdsApp.adGroups()
  .withIds(adGroupIds)
  .get();
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function createKeywords(keywordData, adGroupIterator) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  while(adGroupIterator.hasNext()) {
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    var thisAdGroup = adGroupIterator.next();
  	var thisAdGroupID = thisAdGroup.getId();
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    try {
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      var keywordsToBuild = keywordData[thisAdGroupID]['keywords'];
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      keywordsToBuild.forEach(function(keyword) {
        thisAdGroup.newKeywordBuilder()
        .withText(keyword)
        .build();
        return;
      })
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    } catch (e) {
      continue;
    }
  }
  return;
}

function createAds(adData, adGroupIterator) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  while(adGroupIterator.hasNext()) {
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    var thisAdGroup = adGroupIterator.next();
  	var thisAdGroupID = thisAdGroup.getId();
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    try {
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      var responsiveAdAssets = adData[thisAdGroupID]['ads'];
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      var adOperation = thisAdGroup.newAd().responsiveSearchAdBuilder()
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      // Add headlines
      responsiveAdAssets['headlines'].forEach(function(headline) {
        adOperation['addHeadline'](headline)
      })
      // Add descriptions
      responsiveAdAssets['descriptions'].forEach(function(description) {
        adOperation['addDescription'](description)
      })
      // Paths
      adOperation['withPath1'](responsiveAdAssets['paths'][0])
      adOperation['withPath2'](responsiveAdAssets['paths'][1])
      // LP
      adOperation['withFinalUrl'](responsiveAdAssets['lp'])
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      adOperation.build();
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    } catch (e) {
      continue;
    }
  }
  return;
}
