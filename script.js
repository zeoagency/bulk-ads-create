/*
 * Spreadsheet-based script to bulk create ads.
 */

function main() {
  var sheetURL = "INSERT_SPREADSHEET_URL_"
  var spreadSheetData = readSpreadsheet(sheetURL)
  if (!spreadSheetData) {
    Logger.log('Something is wrong with the source file.')
    return;
  }
  var MccClientID = spreadSheetData.clientID || 'XXX-YYY-ZZZ' // Enter client account ID.
    , MccClientAccounts = MccApp.accounts().withIds([MccClientID]).get()
    , MccClientAccount = MccClientAccounts.next();
  MccApp.select(MccClientAccount);
  createAds(spreadSheetData.adData);
  return;
}

function readSpreadsheet(sheetURL) {
  if (!sheetURL || sheetURL === '') {
    Logger.log('Please provide a valid spreadsheet URL.');
    return false;
  }
  var spreadsheet = SpreadsheetApp.openByUrl(sheetURL)
    , sheet = spreadsheet.getSheetByName('Preview')
    , source = spreadsheet.getSheetByName('Source Info')
    , clientID = source.getRange(1, 2, 1, 1).getValue()
    , startRow = 3
    , startColumn = 1
    , endRow = sheet.getLastRow()
    , endColumn = 13
    , adCollection = sheet.getRange(startRow, startColumn, endRow, endColumn).getValues();

  adCollection = adCollection.filter(function(val, i) {return i % 3 === 0})
                              .filter(function(val, i) {return val[0]})
  var firstNumOfAds = adCollection.length;
  adCollection = adCollection.filter(function(val) {
    var validation = [[8, 30],[9, 30],[10, 90],[11, 15],[12, 15]]
      , valid = true;
    for (var i = 0; i < validation.length; i++) {
      if (val[validation[i][0]] <= 0 || val[validation[i][0]] > validation[i][1]) {
        valid = false;
        break;
      }
    }
    return valid;
  })
  var numOfAds = adCollection.length;
  Logger.log(firstNumOfAds + ' ad(s) found in the source file.');
  if (numOfAds < 1) {
    return false;
  }
  if (firstNumOfAds > numOfAds) {
    Logger.log((firstNumOfAds - numOfAds) + " ad(s) are ignored because of character limits." + " Please check source file warning." )
  }
  adCollection = adCollection.map(function(l) {l.length = 8; return l;}).reduce(function(init, val, i) {
    init[val[val.length - 3]] = init[val[val.length - 3]] || {}
    init[val[val.length - 3]][val[val.length - 2]] = init[val[val.length - 3]][val[val.length - 2]] || {}
    init[val[val.length - 3]][val[val.length - 2]][i] = {}
    init[val[val.length - 3]][val[val.length - 2]][i].headline1 = val[0]
    init[val[val.length - 3]][val[val.length - 2]][i].headline2 = val[1]
    init[val[val.length - 3]][val[val.length - 2]][i].description = val[2]
    init[val[val.length - 3]][val[val.length - 2]][i].path1 = val[3]
    init[val[val.length - 3]][val[val.length - 2]][i].path2 = val[4]
    init[val[val.length - 3]][val[val.length - 2]][i].finalURL = val[7]
    return init
  }, {})
  return {adData: adCollection, clientID: clientID};
}

function createAds(adCollection) {
  for (campaign in adCollection) {
    Logger.log('Processing campaign: ' + campaign)
    var nextCampaign = adCollection[campaign]
    for (adGroup in nextCampaign) {
      Logger.log('Processing ad group: ' + adGroup + ' inside campaign: ' + campaign)
      var nextAdGroup = nextCampaign[adGroup]
      var adGroupIterator = AdWordsApp.adGroups()
      .withCondition("Name = '" + adGroup + "'")
      .withCondition("CampaignName = '" + campaign + "'")
      .get();
      while(adGroupIterator.hasNext()) {
        var targetAdGroup = adGroupIterator.next()
        for (ad in nextAdGroup) {
          Logger.log('Creating ads with ID: ' + ad + ' inside ad group: ' + adGroup + ' inside campaign: ' + campaign)
          var headline1 = nextAdGroup[ad].headline1
          var headline2 = nextAdGroup[ad].headline2
          var description = nextAdGroup[ad].description
          var path1 = nextAdGroup[ad].path1
          var path2 = nextAdGroup[ad].path2
          var finalURL = nextAdGroup[ad].finalURL
          targetAdGroup.newAd().expandedTextAdBuilder()
          .withHeadlinePart1(headline1)
          .withHeadlinePart2(headline2)
          .withDescription(description)
          .withPath1(path1)
          .withPath2(path2)
          .withFinalUrl(finalURL)
          .build();
        }
      }
    }
    Logger.log('===========================')
  }
  return;
}
