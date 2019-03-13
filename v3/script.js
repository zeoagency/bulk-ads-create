/**
  * Google Sheets Tabanlı Toplu Reklam Oluşturucu
  *
  * Bu script, Google Sheets içerisinde yer alan genişletilmiş metin reklamları
  * hedef reklam grupları altında yeni birer reklam olarak oluşturur.
  * 
  * Doğru çalışabilmesi için aşağıdaki seçeneklerin düzenlenmesi gerekmektedir.
  *
  * Kullanılması gereken spreadsheet şablonu:
  * https://docs.google.com/spreadsheets/d/1jExrloljobQrR7uw0qrmDoMBt21IyBVafIzAZdlEnsM
  *
  * ZEO.org
  *
  */

// Seçenekler

var spreadsheetURL = 'SPREADSHEET_URL';
// Kaynak Google Sheets bağlantısı.
// Sonunda /edit ile birlikte kullanılmalı.
// Örnek: https://docs.google.com/spreadsheets/d/1jExrloljobQrR7uw0qrmDoMBt21IyBVafIzAZdlEnsM/edit

var sheetName = 'Sheet1';
// Kaynak dosyada, reklamların bulunduğu sayfanın ismi.

var isMcc = true;
// MCC -Müşteri Merkezim- altında çalıştırılıyorsa true olarak değiştirilmeli.
// Bireysel hesaplarda kullanılıyorsa değiştirilmemeli.

var gAdsCustomerId = 'XXX-YYY-ZZZ';
// MCC altında çalıştırılıyorsa Google Ads müşteri hesap numarası ile değiştirilmeli.

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function main() {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var spreadsheetData = readSpreadsheet(spreadsheetURL);
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!spreadsheetData) {
    return;
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (isMcc) {
    var MccClientAccounts = AdsManagerApp.accounts().withIds([gAdsCustomerId]).get();
    var MccClientAccount = MccClientAccounts.next();
    AdsManagerApp.select(MccClientAccount);
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var targetAdGroups = selectAdGroups(spreadsheetData['adGroupIds']);
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (targetAdGroups.totalNumEntities() === 0) {
    Logger.log(
      'Belirtilen ID\'lere sahip reklam grubu bulunamadı.'
    );
    return;
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var adCreationResult = createAds(spreadsheetData, targetAdGroups);
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  Logger.log(
    'Oluşturulan reklam sayısı: %s\n' + 
    'Hata alınan reklam sayısı: %s',
    adCreationResult['success'], adCreationResult['fail']
    );
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function readSpreadsheet(spreadsheetURL) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!spreadsheetURL || typeof spreadsheetURL === 'undefined') {
    Logger.log(
      'Lütfen geçerli bir Google Sheets URL\'i giriniz.'
      );
    return false;
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  try {
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    var spreadsheet = SpreadsheetApp.openByUrl(spreadsheetURL)
      , sheet = spreadsheet.getSheetByName(sheetName)
      , startRow = 2
      , startColumn = 1
      , endRow = sheet.getLastRow() - 1
      , endColumn = 11
      , rows = sheet.getRange(startRow, startColumn, endRow, endColumn).getValues();
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    var adData = {};
    var adGroupIds = [];
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    rows.forEach(function(row, i) {
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      row = row.map(function(asset) {return asset.toString().trim()});
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      var ad = {}, adGroupId = row[10];
      ad['headlines'] = row.slice(0, 3);
      ad['descriptions'] = row.slice(3, 5);
      ad['paths'] = row.slice(5, 7);
      ad['lp'] = row[7];
      ad['mlp'] = row[8];
      ad['template'] = row[9];
      ad['adGroupId'] = adGroupId;
      ad['rowNumber'] = i + 2;
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      var adErrors = testAdFields(ad);
      if (adErrors.length) {
        Logger.log(
          'Reklam kuralları hatası:\n==============\n%s\n==============\n' + 
          'Satır numarası: %s\nReklam hariç tutuluyor.\nHataları giderip yeniden deneyin.', 
          adErrors.join('\n'), ad['rowNumber']
          );
        return;
      }
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      ad = correctPaths(ad);
      ad = correctFinalUrls(ad);
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      adData[adGroupId] = adData[adGroupId] || {};
      adData[adGroupId]['ads'] = adData[adGroupId]['ads'] || [];
      adData[adGroupId]['ads'].push(ad);
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      if (!~adGroupIds.indexOf(adGroupId)) {
        adGroupIds.push(adGroupId);
      }
    })
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    adData['adGroupIds'] = adGroupIds;
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    return adData;
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  } catch(e) {
    Logger.log(
      'Hata:\n==============\n%s\n==============', e
      );
    Logger.log(
      'Durduruluyor.'
      );
    return false;
  }
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function testAdFields(ad) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var errors = [];
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var headlines = ad['headlines'].filter(function(headline) {return headline.length && headline.length <= 30});
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var descriptions = ad['descriptions'].filter(function(desc) {return desc.length && desc.length <= 90});
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var paths = ad['paths'].filter(function(path) {return path.length > 15});
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var lps = [ad['lp'], ad['mlp']].filter(function(lp) {return lp.length});
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var adGroupId = ad['adGroupId'].length ? true : false;
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (headlines.length < 3) {
    errors.push('Başlık: Karakter aşımı ya da eksik başlık alanı.');
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (descriptions.length < 2) {
    errors.push('Reklam Açıklaması: Karakter aşımı ya da eksik açıklama alanı.');
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (paths.length) {
    errors.push('Görünen URL: Karakter aşımı.');
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!lps.length) {
    errors.push('Açılış Sayfası: Açılış sayfası belirtilmemiş.');
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!adGroupId) {
    errors.push('Reklam Grubu Numarası: Reklam grubu numarası belirtilmemiş.');
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return errors;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function correctPaths(ad) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var paths = ad['paths'].slice();
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!paths[0].length && paths[1].length) {
    ad['paths'][0] = paths[1];
    ad['paths'][1] = '';
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return ad;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function correctFinalUrls(ad) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var finalUrl = ad['lp'], mobileUrl = ad['mlp'];
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (!finalUrl.length) {
    ad['lp'] = mobileUrl;
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return ad;
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function selectAdGroups(adGroupIds) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  if (adGroupIds.length > 10000) {
    Logger.log(
      '10.000\'den daha fazla reklam grubu bulundu. ' +
      'Yalnızca ilk 10.000 satır işlenecek.'
      );
    adGroupIds = adGroupIds.slice(0, 10000);
  } 
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return AdsApp.adGroups()
  .withIds(adGroupIds)
  .get();
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function createAds(adData, adGroupIterator) {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  var successOps = 0, failedOps = 0;
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  while(adGroupIterator.hasNext()) {
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    var thisAdGroup = adGroupIterator.next();
    var thisAdGroupID = thisAdGroup.getId();
    //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
    try {
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      var expandedTextAds = adData[thisAdGroupID]['ads'];
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      if (!expandedTextAds) continue;
      //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      expandedTextAds.forEach(function(expandedTextAd) {
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
        var adOperation = thisAdGroup.newAd().expandedTextAdBuilder();
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
        // Headlines
        expandedTextAd['headlines'].forEach(function(headline, i) {
          adOperation['withHeadlinePart' + (i + 1)](headline);
        });
        // Descriptions
        expandedTextAd['descriptions'].forEach(function(description, i) {
          adOperation['withDescription' + (i + 1)](description);
        });
        // Visible URL
        expandedTextAd['paths'].forEach(function(path, i) {
          adOperation['withPath' + (i + 1)](path);
        });
        // Final URL
        adOperation['withFinalUrl'](expandedTextAd['lp']);
        // Mobile Final URL
        if (expandedTextAd['mlp'].length) {
          adOperation['withMobileFinalUrl'](expandedTextAd['mlp']);
        }
        // Tracking Template
        adOperation['withTrackingTemplate'](expandedTextAd['template']);
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
        var adOperationResult = adOperation.build();
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
        if (adOperationResult.isSuccessful()) {
          successOps++;
        } else {
          Logger.log(
            'Reklam oluşturuluyorken hata meydana geldi. [' + expandedTextAd['headlines'].join(' | ') + ']: ' + 
            adOperationResult.getErrors()
            );
          failedOps++;
         }
        //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
      })
    } catch (e) {
      Logger.log(
        'Hata.\n==============\n%s\n==============\n', e
        );
      continue;
    }
  }
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
  return {success: successOps, fail: failedOps};
}
