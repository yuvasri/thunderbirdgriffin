function getFirstOpener(){
    var last;
    var opener = window.self;
    do{
        last = opener;
        opener = opener.opener;
    } while(opener != null && opener.location && opener.location.href != last.location.href);
    return last;
};    

if(!GriffinCommon || GriffinCommon == null){
    var GriffinCommon = getFirstOpener().GriffinCommon;
    if(!GriffinCommon || GriffinCommon == null){
        // TODO: Cache varous XPCOM classes used in GriffinCommon? Performance?

        GriffinCommon = {
            extensionId: "griffin@mpbsoftware.com",
            databasefile: "griffin.sqlite",

            getCredentialsForUrl: function(url){
                var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
                var e = passwordManager.enumerator;
                // step through each password in the password manager until we find the one we want:
                while (e.hasMoreElements()) {
                    try {
                        var pass = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
                        if (pass.host == url) {
                            return pass;
                        }
                    } catch (ex) {
                        continue;
                    }
                }
                return null;
            },
            
            ensureLogin: function(callbackSuccess, callbackFail){
                if(!callbackSuccess){
                    throw "Only asynchronous login is supported. Specify a callback.";
                }
                if(GriffinCommon.api.isLoggedIn){
                    callbackSuccess();
                }
                else{
                    Griffin.Logger.log("Logging in...", true, true, true);
                    var credentials = GriffinCommon.getCredentialsForUrl(GriffinCommon.api.endpoint);
                    if(credentials != null){
                        try{
                            var loginResult = GriffinCommon.api.login(credentials.user, credentials.password, function(){                                
                                // No password saved or login failed. Login using the dialog box.
                                if(! GriffinCommon.api.isLoggedIn){                
                                    var dialog = window.openDialog('chrome://griffin/content/login.xul', '_blank', 'modal');
                                }
                                // May have still not logged in (e.g. cancelled the login dialog).
                                // TODO: Globalise login status messages
                                if(GriffinCommon.api.isLoggedIn){
                                    Griffin.Logger.log("Login successful...", true, true, false);
                                    callbackSuccess();
                                }
                                else{
                                    Griffin.Logger.log("Login failed. See Error Console for details.", true, true, false);  
                                    if(callbackFail){
                                        callbackFail();  
                                    }
                                }
                            });
                        } catch (e) {
                            // TODO: Globalise.
                             Griffin.Logger.log('Stored login for ' + GriffinCommon.api.endpoint + ' failed with error ' + e, true, true, true);
                        }
                    }
                }
            },
            
            getAbUrlFromId: function(id){
                return GriffinCommon.executeScalar("SELECT cc.AbUrl FROM AbCardContact cc, CRM c WHERE cc.CrmId = c.CRMId AND cc.CrmRecordId = '" + id + "' AND c.CRMName = '" + GriffinCommon.api.crmName + "'");
            },
            
            getCrmRecordIdFromUrl: function(url){
                return GriffinCommon.executeScalar("SELECT cc.CrmRecordId FROM AbCardContact cc, CRM c WHERE cc.CrmId = c.CRMId AND cc.AbUrl = '" + url + "' AND c.CRMName = '" + GriffinCommon.api.crmName + "'");
            },
            
            insertCrmRecordAbCardUrl: function(id, url){
                GriffinCommon.executeNonQuery("INSERT OR REPLACE INTO AbCardContact (AbUrl, CrmRecordId, CrmId) SELECT '" + url + "', '" + id + "', CRMId FROM CRM WHERE CRMId = '" + GriffinCommon.api.crmName + "'");
            },
            
            getFieldMap: function(obj){    
                var connection = GriffinCommon.getDbConnection();
                var statement = connection.createStatement("SELECT tBirdField, crmField, strength FROM FieldMap fm, TBirdFields t, CRM c WHERE fm.CRMId = c.CRMId AND c.CRMName = '" + GriffinCommon.api.crmName + "' AND t.fieldId = fm.fieldId AND t.object = '" + obj + "'");
                var fieldMap = [];
                try{
                    while(statement.executeStep()){
                        var s_tBirdField = statement.getUTF8String(0);
                        var s_crmField = statement.getUTF8String(1);
                        var s_strength = statement.getUTF8String(2);
                        fieldMap.push( new Griffin.FieldMap(s_tBirdField, s_crmField, s_strength));
                    }
                    return fieldMap;
                }
                finally{
                    statement.reset();
                }
            },
            
            getCrmObjectFromTbirdObject: function(tbirdObj){
                return GriffinCommon.executeScalar("SELECT om.CRMObject FROM ObjectMap om, CRM c WHERE om.CRMId = c.CRMId AND om.TBirdObject = '" + tbirdObj + "' AND c.CRMName = '" + GriffinCommon.api.crmName + "'");
            },
            
            ensureDatabaseTable: function(tableName, tablePopulation, conn){
                GriffinCommon.Logger.log("Validating table " + tableName, true, true);
                var tableExistsStmt = conn.createStatement('pragma table_info("' + tableName + '");');
                try{
                    var exists = tableExistsStmt.executeStep();
                }
                finally{
                    tableExistsStmt.reset();
                }
                if(!exists){
                    GriffinCommon.Logger.log("Creating table " + tableName, true, true);
                    var tableCreateStmt = conn.createStatement(tablePopulation);                        
                    tableCreateStmt.execute();
                };
            },
            
            ensureDatabase: function(){
                Griffin.Logger.log("Validating database structure...", true, true);
                var em = Components.classes["@mozilla.org/extensions/manager;1"].
                         getService(Components.interfaces.nsIExtensionManager);
                var file = em.getInstallLocation(GriffinCommon.extensionId).getItemFile(GriffinCommon.extensionId, GriffinCommon.databasefile);
                if(!file.exists()){
                    Griffin.Logger.log("Creating sqlite database...", true, true);
                    file.create(file.NORMAL_FILE_TYPE, 0777);
                }
                var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                .getService(Components.interfaces.mozIStorageService);
                var conn = storageService.openDatabase(file);
                GriffinCommon.ensureDatabaseTable("CRM", 
                    'CREATE TABLE "CRM" ("CRMId" INTEGER PRIMARY KEY  AUTOINCREMENT  NOT NULL , "CRMName" varchar NOT NULL );' + 
                    'INSERT INTO "CRM" VALUES(1,\'Salesforce\');' + 
                    'INSERT INTO "CRM" VALUES(2,\'Zoho\');'
                    );
               GriffinCommon.ensureDatabaseTable("AbCardContact",
                    'CREATE TABLE "AbCardContact" ("Id" INTEGER PRIMARY KEY  NOT NULL ,"AbUrl" VARCHAR NOT NULL ,"CrmRecordId" VARCHAR, "CrmId" INTEGER NOT NULL  DEFAULT 1);'
                    );
               GriffinCommon.ensureDatabaseTable("FieldMap",
                    'CREATE TABLE "FieldMap" ("fieldId" INTEGER NOT NULL , "CRMId" INTEGER NOT NULL , "crmField" VARCHAR NOT NULL , "strength" DOUBLE NOT NULL  DEFAULT 0, PRIMARY KEY ("fieldId", "CRMId"));' +
                    'INSERT INTO "FieldMap" VALUES(1,2,\'First Name\',5);' +
                    'INSERT INTO "FieldMap" VALUES(2,2,\'Last Name\',10);' + 
                    'INSERT INTO "FieldMap" VALUES(7,2,\'Email\',50);' +
                    'INSERT INTO "FieldMap" VALUES(9,2,\'Phone\',5);' +
                    'INSERT INTO "FieldMap" VALUES(10,2,\'Home Phone\',5);' +
                    'INSERT INTO "FieldMap" VALUES(11,2,\'Fax\',5);' +
                    'INSERT INTO "FieldMap" VALUES(13,2,\'Mobile\',5);' +
                    'INSERT INTO "FieldMap" VALUES(19,2,\'Other Street\',5);' +
                    'INSERT INTO "FieldMap" VALUES(21,2,\'Other City\',5);' +
                    'INSERT INTO "FieldMap" VALUES(22,2,\'Other State\',5);' + 
                    'INSERT INTO "FieldMap" VALUES(23,2,\'Other Zip\',5);' +
                    'INSERT INTO "FieldMap" VALUES(24,2,\'Other Country\',5);' +
                    'INSERT INTO "FieldMap" VALUES(25,2,\'Mailing Street\',5);' +
                    'INSERT INTO "FieldMap" VALUES(27,2,\'Mailing City\',5);'+
                    'INSERT INTO "FieldMap" VALUES(28,2,\'Mailing State\',5);'+
                    'INSERT INTO "FieldMap" VALUES(29,2,\'Mailing Zip\',5);'+
                    'INSERT INTO "FieldMap" VALUES(30,2,\'Mailing Country\',5);'+
                    'INSERT INTO "FieldMap" VALUES(31,2,\'Title\',0);'+
                    'INSERT INTO "FieldMap" VALUES(32,2,\'Department\',0);'+
                    'INSERT INTO "FieldMap" VALUES(33,2,\'Account Name\',15);'+
                    'INSERT INTO "FieldMap" VALUES(34,2,\'Skype ID\',0);'+
                    'INSERT INTO "FieldMap" VALUES(47,2,\'CONTACTID\',250);'+
                    'INSERT INTO "FieldMap" VALUES(51,2,\'Description\',0);'+
                    'INSERT INTO "FieldMap" VALUES(70,2,\'Due Date\',0);'+
                    'INSERT INTO "FieldMap" VALUES(75,2,\'Subject\',0);'+
                    'INSERT INTO "FieldMap" VALUES(85,2,\'Description\',0);'+
                    'INSERT INTO "FieldMap" VALUES(1,1,\'FirstName\',5);'+
                    'INSERT INTO "FieldMap" VALUES(2,1,\'LastName\',20);'+
                    'INSERT INTO "FieldMap" VALUES(7,1,\'Email\',50);'+
                    'INSERT INTO "FieldMap" VALUES(9,1,\'Phone\',5);'+
                    'INSERT INTO "FieldMap" VALUES(10,1,\'HomePhone\',5);'+
                    'INSERT INTO "FieldMap" VALUES(11,1,\'Fax\',5);'+
                    'INSERT INTO "FieldMap" VALUES(13,1,\'MobilePhone\',5);'+
                    'INSERT INTO "FieldMap" VALUES(19,1,\'OtherStreet\',0);'+
                    'INSERT INTO "FieldMap" VALUES(21,1,\'OtherCity\',0);'+
                    'INSERT INTO "FieldMap" VALUES(22,1,\'OtherState\',0);'+
                    'INSERT INTO "FieldMap" VALUES(23,1,\'OtherPostalCode\',0);'+
                    'INSERT INTO "FieldMap" VALUES(24,1,\'OtherCountry\',0);'+
                    'INSERT INTO "FieldMap" VALUES(25,1,\'MailingStreet\',5);'+
                    'INSERT INTO "FieldMap" VALUES(27,1,\'MailingCity\',5);'+
                    'INSERT INTO "FieldMap" VALUES(28,1,\'MailingState\',5);'+
                    'INSERT INTO "FieldMap" VALUES(29,1,\'MailingPostalCode\',5);'+
                    'INSERT INTO "FieldMap" VALUES(30,1,\'MailingCountry\',0);'+
                    'INSERT INTO "FieldMap" VALUES(31,1,\'Title\',0);'+
                    'INSERT INTO "FieldMap" VALUES(32,1,\'Department\',0);'+
                    'INSERT INTO "FieldMap" VALUES(47,1,\'Id\',200);'+
                    'INSERT INTO "FieldMap" VALUES(51,1,\'Description\',0);'+
                    'INSERT INTO "FieldMap" VALUES(70,1,\'ActivityDate\',0);'+
                    'INSERT INTO "FieldMap" VALUES(75,1,\'Subject\',0);' +
                    'INSERT INTO "FieldMap" VALUES(85,1,\'Description\',0);'
                );
                GriffinCommon.ensureDatabaseTable("ObjectMap",
                    'CREATE TABLE "ObjectMap" ("ObjectId" INTEGER PRIMARY KEY  AUTOINCREMENT  NOT NULL , "CRMId" INTEGER NOT NULL , "TBirdObject" varchar NOT NULL , "CRMObject" VARCHAR NOT NULL );' + 
                    'INSERT INTO "ObjectMap" VALUES(1,1,\'Contact\',\'Contact\');' +
                    'INSERT INTO "ObjectMap" VALUES(2,1,\'Task\',\'Task\');' +
                    'INSERT INTO "ObjectMap" VALUES(3,2,\'Task\',\'Tasks\');' +
                    'INSERT INTO "ObjectMap" VALUES(4,2,\'Contact\',\'Contacts\');'
                );
                GriffinCommon.ensureDatabaseTable("TBirdFields",
                    'CREATE TABLE "TBirdFields" ("fieldId" INTEGER PRIMARY KEY  NOT NULL ,"object" VARCHAR NOT NULL ,"tbirdField" VARCHAR NOT NULL ,"label" VARCHAR);' +
                    'INSERT INTO "TBirdFields" VALUES(1,\'Contact\',\'firstName\',\'Contact.firstName\');' +
                    'INSERT INTO "TBirdFields" VALUES(2,\'Contact\',\'lastName\',\'Contact.lastName\');' +
                    'INSERT INTO "TBirdFields" VALUES(3,\'Contact\',\'phoneticFirstName\',\'Contact.phoneticFirstName\');' +
                    'INSERT INTO "TBirdFields" VALUES(4,\'Contact\',\'phoneticLastName\',\'Contact.phoneticLastName\');' +
                    'INSERT INTO "TBirdFields" VALUES(5,\'Contact\',\'displayName\',\'Contact.displayName\');' +
                    'INSERT INTO "TBirdFields" VALUES(6,\'Contact\',\'nickName\',\'Contact.nickName\');' +
                    'INSERT INTO "TBirdFields" VALUES(7,\'Contact\',\'primaryEmail\',\'Contact.primaryEmail\');' +
                    'INSERT INTO "TBirdFields" VALUES(8,\'Contact\',\'secondEmail\',\'Contact.secondEmail\');' +
                    'INSERT INTO "TBirdFields" VALUES(9,\'Contact\',\'workPhone\',\'Contact.workPhone\');' +
                    'INSERT INTO "TBirdFields" VALUES(10,\'Contact\',\'homePhone\',\'Contact.homePhone\');' +
                    'INSERT INTO "TBirdFields" VALUES(11,\'Contact\',\'faxNumber\',\'Contact.faxNumber\');' +
                    'INSERT INTO "TBirdFields" VALUES(12,\'Contact\',\'pagerNumber\',\'Contact.pagerNumber\');' +
                    'INSERT INTO "TBirdFields" VALUES(13,\'Contact\',\'cellularNumber\',\'Contact.cellularNumber\');' +
                    'INSERT INTO "TBirdFields" VALUES(14,\'Contact\',\'workPhoneType\',\'Contact.workPhoneType\');' +
                    'INSERT INTO "TBirdFields" VALUES(15,\'Contact\',\'homePhoneType\',\'Contact.homePhoneType\');' +
                    'INSERT INTO "TBirdFields" VALUES(16,\'Contact\',\'faxNumberType\',\'Contact.faxNumberType\');' +
                    'INSERT INTO "TBirdFields" VALUES(17,\'Contact\',\'pagerNumberType\',\'Contact.pagerNumberType\');' +
                    'INSERT INTO "TBirdFields" VALUES(18,\'Contact\',\'cellularNumberType\',\'Contact.cellularNumberType\');' +
                    'INSERT INTO "TBirdFields" VALUES(19,\'Contact\',\'homeAddress\',\'Contact.homeAddress\');' +
                    'INSERT INTO "TBirdFields" VALUES(20,\'Contact\',\'homeAddress2\',\'Contact.homeAddress2\');' +
                    'INSERT INTO "TBirdFields" VALUES(21,\'Contact\',\'homeCity\',\'Contact.homeCity\');' +
                    'INSERT INTO "TBirdFields" VALUES(22,\'Contact\',\'homeState\',\'Contact.homeState\');' +
                    'INSERT INTO "TBirdFields" VALUES(23,\'Contact\',\'homeZipCode\',\'Contact.homeZipCode\');' +
                    'INSERT INTO "TBirdFields" VALUES(24,\'Contact\',\'homeCountry\',\'Contact.homeCountry\');' +
                    'INSERT INTO "TBirdFields" VALUES(25,\'Contact\',\'workAddress\',\'Contact.workAddress\');' +
                    'INSERT INTO "TBirdFields" VALUES(26,\'Contact\',\'workAddress2\',\'Contact.workAddress2\');' +
                    'INSERT INTO "TBirdFields" VALUES(27,\'Contact\',\'workCity\',\'Contact.workCity\');' +
                    'INSERT INTO "TBirdFields" VALUES(28,\'Contact\',\'workState\',\'Contact.workState\');' +
                    'INSERT INTO "TBirdFields" VALUES(29,\'Contact\',\'workZipCode\',\'Contact.workZipCode\');' +
                    'INSERT INTO "TBirdFields" VALUES(30,\'Contact\',\'workCountry\',\'Contact.workCountry\');' +
                    'INSERT INTO "TBirdFields" VALUES(31,\'Contact\',\'jobTitle\',\'Contact.jobTitle\');' +
                    'INSERT INTO "TBirdFields" VALUES(32,\'Contact\',\'department\',\'Contact.department\');' +
                    'INSERT INTO "TBirdFields" VALUES(33,\'Contact\',\'company\',\'Contact.company\');' +
                    'INSERT INTO "TBirdFields" VALUES(34,\'Contact\',\'aimScreenName\',\'Contact.aimScreenName\');' +
                    'INSERT INTO "TBirdFields" VALUES(35,\'Contact\',\'anniversaryYear\',\'Contact.anniversaryYear\');' +
                    'INSERT INTO "TBirdFields" VALUES(36,\'Contact\',\'anniversaryMonth\',\'Contact.anniversaryMonth\');' +
                    'INSERT INTO "TBirdFields" VALUES(37,\'Contact\',\'anniversaryDay\',\'Contact.anniversaryDay\');' +
                    'INSERT INTO "TBirdFields" VALUES(38,\'Contact\',\'spouseName\',\'Contact.spouseName\');' +
                    'INSERT INTO "TBirdFields" VALUES(39,\'Contact\',\'familyName\',\'Contact.familyName\');' +
                    'INSERT INTO "TBirdFields" VALUES(40,\'Contact\',\'defaultAddress\',\'Contact.defaultAddress\');' +
                    'INSERT INTO "TBirdFields" VALUES(41,\'Contact\',\'category\',\'Contact.category\');' +
                    'INSERT INTO "TBirdFields" VALUES(42,\'Contact\',\'webPage1\',\'Contact.webPage1\');' +
                    'INSERT INTO "TBirdFields" VALUES(43,\'Contact\',\'webPage2\',\'Contact.webPage2\');' +
                    'INSERT INTO "TBirdFields" VALUES(44,\'Contact\',\'birthYear\',\'Contact.birthYear\');' +
                    'INSERT INTO "TBirdFields" VALUES(45,\'Contact\',\'birthMonth\',\'Contact.birthMonth\');' +
                    'INSERT INTO "TBirdFields" VALUES(46,\'Contact\',\'birthDay\',\'Contact.birthDay\');' +
                    'INSERT INTO "TBirdFields" VALUES(47,\'Contact\',\'custom1\',\'Contact.custom1\');' +
                    'INSERT INTO "TBirdFields" VALUES(48,\'Contact\',\'custom2\',\'Contact.custom2\');' +
                    'INSERT INTO "TBirdFields" VALUES(49,\'Contact\',\'custom3\',\'Contact.custom3\');' +
                    'INSERT INTO "TBirdFields" VALUES(50,\'Contact\',\'custom4\',\'Contact.custom4\');' +
                    'INSERT INTO "TBirdFields" VALUES(51,\'Contact\',\'notes\',\'Contact.notes\');' +
                    'INSERT INTO "TBirdFields" VALUES(52,\'Contact\',\'lastModifiedDate\',\'Contact.lastModifiedDate\');' +
                    'INSERT INTO "TBirdFields" VALUES(53,\'Contact\',\'popularityIndex\',\'Contact.popularityIndex\');' +
                    'INSERT INTO "TBirdFields" VALUES(54,\'Contact\',\'preferMailFormat\',\'Contact.preferMailFormat\');' +
                    'INSERT INTO "TBirdFields" VALUES(55,\'Contact\',\'isMailList\',\'Contact.isMailList\');' +
                    'INSERT INTO "TBirdFields" VALUES(56,\'Contact\',\'mailListURI\',\'Contact.mailListURI\');' +
                    'INSERT INTO "TBirdFields" VALUES(57,\'Contact\',\'allowRemoteContent\',\'Contact.allowRemoteContent\');' +
                    'INSERT INTO "TBirdFields" VALUES(58,\'Task\',\'isRead\',\'Task.isRead\');' +
                    'INSERT INTO "TBirdFields" VALUES(59,\'Task\',\'isFlagged\',\'Task.isFlagged\');' +
                    'INSERT INTO "TBirdFields" VALUES(60,\'Task\',\'priority\',\'Task.priority\');' +
                    'INSERT INTO "TBirdFields" VALUES(61,\'Task\',\'flags\',\'Task.flags\');' +
                    'INSERT INTO "TBirdFields" VALUES(62,\'Task\',\'threadId\',\'Task.threadId\');' +
                    'INSERT INTO "TBirdFields" VALUES(63,\'Task\',\'messageKey\',\'Task.messageKey\');' +
                    'INSERT INTO "TBirdFields" VALUES(64,\'Task\',\'threadParent\',\'Task.threadParent\');' +
                    'INSERT INTO "TBirdFields" VALUES(65,\'Task\',\'messageSize\',\'Task.messageSize\');' +
                    'INSERT INTO "TBirdFields" VALUES(66,\'Task\',\'lineCount\',\'Task.lineCount\');' +
                    'INSERT INTO "TBirdFields" VALUES(67,\'Task\',\'statusOffset\',\'Task.statusOffset\');' +
                    'INSERT INTO "TBirdFields" VALUES(68,\'Task\',\'messageOffset\',\'Task.messageOffset\');' +
                    'INSERT INTO "TBirdFields" VALUES(69,\'Task\',\'offlineMessageSize\',\'Task.offlineMessageSize\');' +
                    'INSERT INTO "TBirdFields" VALUES(70,\'Task\',\'date\',\'Task.date\');' +
                    'INSERT INTO "TBirdFields" VALUES(71,\'Task\',\'dateInSeconds\',\'Task.dateInSeconds\');' +
                    'INSERT INTO "TBirdFields" VALUES(72,\'Task\',\'messageId\',\'Task.messageId\');' +
                    'INSERT INTO "TBirdFields" VALUES(73,\'Task\',\'ccList\',\'Task.ccList\');' +
                    'INSERT INTO "TBirdFields" VALUES(74,\'Task\',\'author\',\'Task.author\');' +
                    'INSERT INTO "TBirdFields" VALUES(75,\'Task\',\'subject\',\'Task.subject\');' +
                    'INSERT INTO "TBirdFields" VALUES(76,\'Task\',\'recipients\',\'Task.recipients\');' +
                    'INSERT INTO "TBirdFields" VALUES(77,\'Task\',\'numReferences\',\'Task.numReferences\');' +
                    'INSERT INTO "TBirdFields" VALUES(78,\'Task\',\'mime2DecodedAuthor\',\'Task.mime2DecodedAuthor\');' +
                    'INSERT INTO "TBirdFields" VALUES(79,\'Task\',\'mime2DecodedSubject\',\'Task.mime2DecodedSubject\');' +
                    'INSERT INTO "TBirdFields" VALUES(80,\'Task\',\'mime2DecodedRecipients\',\'Task.mime2DecodedRecipients\');' +
                    'INSERT INTO "TBirdFields" VALUES(81,\'Task\',\'Charset\',\'Task.Charset\');' +
                    'INSERT INTO "TBirdFields" VALUES(82,\'Task\',\'label\',\'Task.label\');' +
                    'INSERT INTO "TBirdFields" VALUES(83,\'Task\',\'accountKey\',\'Task.accountKey\');' +
                    'INSERT INTO "TBirdFields" VALUES(84,\'Task\',\'folder\',\'Task.folder\');' +
                    'INSERT INTO "TBirdFields" VALUES(85,\'Task\',\'body\',\'Task.body\');'
                );
            },
            
            // Get a connection to the database used for storing settings.
            // TODO: Cache connection??
            getDbConnection: function(){    
                var em = Components.classes["@mozilla.org/extensions/manager;1"].
                         getService(Components.interfaces.nsIExtensionManager);
                var file = em.getInstallLocation(GriffinCommon.extensionId).getItemFile(GriffinCommon.extensionId, GriffinCommon.databasefile);
                var storageService = Components.classes["@mozilla.org/storage/service;1"]
                                .getService(Components.interfaces.mozIStorageService);
                return storageService.openDatabase(file);
            },
            
            executeScalar: function(statement){
                var connection = GriffinCommon.getDbConnection();
                var sqlStatement = connection.createStatement(statement);
                try{
                    if(sqlStatement.executeStep()){
                        return sqlStatement.getUTF8String(0);
                    }
                }
                finally{
                    sqlStatement.reset();
                }
                return null;
            },
            
            executeNonQuery: function(statement){
                var connection = GriffinCommon.getDbConnection();
                var sqlStatement = connection.createStatement(statement);
                try{
                    sqlStatement.execute();
                }
                finally{
                    sqlStatement.reset();
                }
                return null;
            },
            
            getAddressBooks: function(){                
                var addressBooks = [];
                var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
                // enumerate all of the address books on this system
                var parentDir = rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
                var enumerator = parentDir.childNodes;
                while (enumerator.hasMoreElements()) {
                    addressBooks.push(enumerator.getNext().QueryInterface(Components.interfaces.nsIAbDirectory));
                }
                return addressBooks;
            },
            
            getCandidateMatches: function(contact, fieldMaps){
                // TODO: Limit getCardForContact search so that we only get getBestMatch on relevant cards (ie ones that match on at least one field). Partially implemented, see commented out code.
                /*
                var queryString = "?(or";
                for(var currMapIdx = 0; currMapIdx < fieldMaps.length; ++currMapIdx){
                    if(currMapIdx > 0)
                        queryString += ",";
                    var currMap = fieldMaps[currMapIdx];
                    queryString += "(" + currMap.tbirdField + ",c," + contact[currMap.crmField] + ")"
                }
                queryString += ")";
                */
                var candidates = [];
                var addrBookUrl = Griffin.Prefs.getPrefValue("synchAddrBook", "string");
                var addressBooks = GriffinCommon.getAddressBooks();
                for(var i = 0; i < addressBooks.length; i++){
                    var addrbook = addressBooks[i];
                    if(!(addrBookUrl == 'ALL' || addrBookUrl == addrbook.directoryProperties.URI)){
                        continue;
                    }
                    /*
                    var uri = addrbook.directoryProperties.URI + queryString;
                    var queryDir = rdfService.GetResource(uri).QueryInterface(Components.interfaces.nsIAbDirectory);
                    var childCards = queryDir.childNodes;
                    while(childCards.hasMoreElements()) {
                        var card = childCards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
                        candidates.push({Card: card, Directory: addrbook.directoryProperties.URI});
                    }          
                    var childCards = queryDir.childCards;
                    */
                    var childCards = addrbook.childCards;
                    // childCards is an nsIEnumerator, not nsiSimpleEnumerator. We must call childCards.first(), 
                    // and if that works (no err) call childCards.next() until we do error. See Url for sample code.
                    // http://thunderbirddocs.blogspot.com/2005/05/thunderbird-extensions-documentation_31.html
                    var keepGoing = 1;
                    try{
                        childCards.first();
                    }catch(err){
                        keepGoing = 0;
                    }
                    while(keepGoing == 1){
                        var card = childCards.currentItem().QueryInterface(Components.interfaces.nsIAbCard);                    
                        candidates.push({Card: card, Directory: addrbook.directoryProperties.URI});
                        try{
                            childCards.next();
                        }catch(err){
                            keepGoing = 0;
                        }
                    }
                 }
                 return candidates;
            },
            
            // TODO: Perhaps getBestMatch should be somewhere else? See getCardForContact
            getBestMatch: function(fieldMaps, possibleMatches, contact){
                var bestMatchValue = 0;
                var bestMatch = null;
                for(var idx = 0; idx < possibleMatches.length; idx++){
                    var matchStrength = GriffinCommon.getMatchStrength(fieldMaps, possibleMatches[idx].Card, contact);
                    if(matchStrength > bestMatchValue){
                        bestMatch = possibleMatches[idx];
                        bestMatchValue = matchStrength;
                    }
                }
                if(bestMatchValue > 0){
                    Griffin.Logger.log("Returning a matching card with score " + bestMatchValue, true, false, false);
                } 
                else{
                    Griffin.Logger.log("No match found in getBestMatch function. Returning null.", true, false, false);
                } 
                if(bestMatchValue > 50)
                    return bestMatch;
                else 
                    return null;
            },
            
            /**
            Used to determine how closely a card matches the crm contact, based on the field maps and strength values.
            */
            // TODO: Perhaps getMatchStrength should be somewhere else? See getCardForContact
            getMatchStrength: function(fieldMaps, candidateCard, contact){
                var str = 0;
                for(var mapIdx = 0; mapIdx < fieldMaps.length; mapIdx++){
                    var currMap = fieldMaps[mapIdx];
                    if(contact[currMap.crmField] == candidateCard[currMap.tbirdField]){
                        str += Number(currMap.strength);
                    }
                }
                return str;
            },
            
            /**
            Debugging function. Dump all the property names of an object to a string.
            */
            logProps: function(obj){
                var msg = "";
                for(prop in obj){
                    msg += prop + ", "
                }
                Griffin.Logger.log(msg, true, false, false);
            },
            
            api: Griffin.CrmApi.GetApi()
        };
    }
}

/*
// Lifted from http://mb.eschew.org/16#sub_16.7
// May be useful for debugging rdf
function _dumpFactSubtree(ds, sub, level)
{
  var iter, iter2, pred, obj, objstr, result="";

  // bail if passed an nsIRDFLiteral or other non-URI
  try { iter = ds.ArcLabelsOut(sub); }
  catch (ex) { return; }

  while (iter.hasMoreElements())
  {
	pred = iter.getNext().QueryInterface(Ci.nsIRDFResource);
	iter2 = ds.GetTargets(sub, pred, true);

	while (iter2.hasMoreElements())
	{
	  obj = iter2.getNext();
	  try {
	obj = obj.QueryInterface(Ci.nsIRDFResource);
	objstr = obj.Value;
	  }
	  catch (ex)
	  {
	obj = obj.QueryInterface(Ci.nsIRDFLiteral);
	objstr = '"' + obj.Value + '"';
	  }

	  result += level + " " + sub.Value + " , " +
		pred.Value + " , " + objstr + "\n";

	  result += dumpFactSubtree(ds, obj, level+1);
	}
  }
  return result;
}

function dumpFromRoot(ds, rootURI)
{
  return _dumpFactSubtree(ds, rootURI, 0);
}
*/

