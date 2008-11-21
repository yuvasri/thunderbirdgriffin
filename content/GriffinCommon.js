// TODO: Cache varous XPCOM classes used in GriffinCommon? Performance?

var GriffinCommon = {
    extensionId: "griffin@mpbsoftware.com",
    databasefile: "griffin.sqlite",   
    logFile: "griffin.log",
    
    getFirstOpener: function(){
        var last;
        var opener = window.self;
        do{
            last = opener;
            opener = opener.opener;
        } while(opener != null && opener.location && opener.location.href != last.location.href);
        return last;
    },
    
    // TODO: Unstink-ify the padLeft function (there must be a way!!).
    padLeft: function(inString, padChar, targetLen){
        while(inString.length < targetLen){
            inString = padChar + inString;
        }
        return inString;
    },
    
    formatDateSfdc: function(inDate){
        var year = GriffinCommon.padLeft(inDate.getUTCFullYear().toString(), "0", 4);
        // Gotcha! getMonth runs from 0-11, so add one to result!
        var month = GriffinCommon.padLeft((inDate.getUTCMonth() + 1).toString(), "0", 2); 
        var day = GriffinCommon.padLeft(inDate.getUTCDate().toString(), "0", 2);
        var hour = GriffinCommon.padLeft(inDate.getUTCHours().toString(), "0", 2);
        var minute = GriffinCommon.padLeft(inDate.getUTCMinutes().toString(), "0", 2);
        var second = GriffinCommon.padLeft(inDate.getUTCSeconds().toString(), "0", 2);
        return year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + "Z";
    },
    
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
    
    // TODO: Login asynchronously
    ensureLogin: function(){
        GriffinCommon.log("Logging in...", true, true, true);
        if(sforce.connection.sessionId == null){
            var url = GriffinCommon.getPrefValue("serverUrl", "string");
            sforce.connection.serverUrl = url;
            var credentials = GriffinCommon.getCredentialsForUrl(url);
            if(credentials != null){
                try{
                    var loginResult = sforce.connection.login(credentials.user, credentials.password);
                } catch (e) {
                // TODO: Globalise.
                     GriffinCommon.log('Stored login for ' + url + ' failed with error ' + e, true, true, true);
                }
            }
            // No password saved or login failed. Login using the dialog box.
            if(sforce.connection.sessionId == null){                
                var dialog = window.openDialog('chrome://griffin/content/login.xul', '_blank', 'modal');
            }
        }
        // May have still not logged in (e.g. cancelled the login dialog).
        var hasLoggedIn = sforce.connection.sessionId != null;    
        // TODO: Globalise login status messages
        if(hasLoggedIn){
            GriffinCommon.log("Login successful...", true, true, false);
        }
        else{
            GriffinCommon.log("Login failed. See Error Console for details.", true, true, false);                
        }
        return hasLoggedIn
    },
    
    getFieldMap: function(obj){    
        var connection = GriffinCommon.getDbConnection();
        var statement = connection.createStatement("SELECT tBirdField, sfdcField, strength FROM FieldMap fm, TBirdFields t WHERE t.fieldId = fm.fieldId AND t.object = '" + obj + "'");
        var fieldMap = [];
        try{
            while(statement.executeStep()){
                var s_tBirdField = statement.getUTF8String(0);
                var s_sfdcField = statement.getUTF8String(1);
                var s_strength = statement.getUTF8String(2);
                fieldMap.push( { tbirdField: s_tBirdField, sfdcField: s_sfdcField, strength: s_strength});
            }
            return fieldMap;
        }
        finally{
            statement.reset();
        }
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
 
    log: function(msg, error, status, persist){       
        if(error){
            // TODO: Use nsIConsoleMessage interface of @mozilla.org/scripterror;1 for logging to error console - flexibility.
            var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
            consoleService.logStringMessage(msg);
        }
        if(status){
            var statusPanel = document.getElementById("gfn_status");
            if(statusPanel != null){
                statusPanel.setAttribute("label", msg);
            }
        }
        if(persist){
            // TODO: Make persistant logging to file work!!
//            var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
//            var logFile = em.getInstallLocation(GriffinCommon.extensionId).getItemFile(GriffinCommon.extensionId, GriffinCommon.logFile);
//            if(!logFile.exists()){
//                // 468 (dec) = 666 (oct) -> rw permissions for all users? How did I calculate this? http://www.robolink.co.uk/calculators10.htm
//                logFile.create(logFile.NORMAL_FILE_TYPE, 438);
//            }
//            var obj = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
//            obj.init(logFile, -1, -1, 0);
//            obj.write(msg, msg.length);
//            obj.close();
        }
    },
        
    getPrefValue: function(pref, type) {
        try{
            // Get the "extensions.griffin." branch
            var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
            prefs = prefs.getBranch("extensions.griffin.");
            switch (type.toLowerCase()){
                case "string": return prefs.getCharPref(pref);
                case "int": return prefs.getIntPref(pref);
                case "bool": return prefs.getBoolPref(pref);
                case "datetime": return new Date(pref.getCharPref(pref));
                case "float": return prefs.getCharPref(pref);
                default: return prefs.getCharPref(pref);
            }
        } catch (e){
            // Above functions will throw NS_ERROR_UNEXPECTED on unset prefs. I'd rather return null and let consumer pick a default.
            return null;
        }
    },
    
    setPrefValue: function(pref, value, type){    
        GriffinCommon.log("Updating pref " + pref + " to " + value, true, false, true);
        // Get the "extensions.griffin." branch
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        prefs = prefs.getBranch("extensions.griffin.");
        switch (type.toLowerCase()){
            case "string": prefs.setCharPref(pref, value); break;
            case "int": prefs.setIntPref(pref, value); break;
            case "bool": prefs.setBoolPref(pref, value); break;
            case "datetime": pref.setCharPref(pref, value); break;
            case "float": prefs.setCharPref(pref, value); break;
            default: prefs.setCharPref(pref, value); break;
        }
    },
    
    // TODO: Perhaps this should be somewhere else? Called on both addMessage, and synchContact methods. Some kind of OO class I imagine?
    getCardForContact: function(contact, fieldMaps){
        // TODO: Limit getCardForContact search so that we only get getBestMatch on relevant cards (ie ones that match on at least one field). Partially implemented, see commented out code.
        /*
        var queryString = "?(or";
        for(var currMapIdx = 0; currMapIdx < fieldMaps.length; ++currMapIdx){
            if(currMapIdx > 0)
                queryString += ",";
            var currMap = fieldMaps[currMapIdx];
            queryString += "(" + currMap.tbirdField + ",c," + contact[currMap.sfdcField] + ")"
        }
        queryString += ")";
        */
        var candidates = [];
        var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
        // enumerate all of the address books on this system
        var parentDir = rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
        var enumerator = parentDir.childNodes;
        while (enumerator.hasMoreElements()) {
            var addrbook = enumerator.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
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
                //GriffinCommon.log("childCards.first errored - " + err, true, false, false);
                keepGoing = 0;
            }
            while(keepGoing == 1){
                var card = childCards.currentItem().QueryInterface(Components.interfaces.nsIAbCard);                    
                candidates.push({Card: card, Directory: addrbook.directoryProperties.URI});
                try{
                    childCards.next();
                }catch(err){
                    //GriffinCommon.log("childCards.next errored - " + err, true, false, false);
                    keepGoing = 0;
                }
            }
        }
        return GriffinCommon.getBestMatch(fieldMaps, candidates, contact);
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
            GriffinCommon.log("Returning a matching card with score " + bestMatchValue, true, false, false);
        } 
        else{
            GriffinCommon.log("No match found in getBestMatch function. Returning null.", true, false, false);
        } 
        if(bestMatchValue > 50)
            return bestMatch;
        else 
            return null;
    },
    
    // TODO: Perhaps getMatchStrength should be somewhere else? See getCardForContact
    getMatchStrength: function(fieldMaps, candidateCard, contact){
        var str = 0;
        for(var mapIdx = 0; mapIdx < fieldMaps.length; mapIdx++){
            var currMap = fieldMaps[mapIdx];
            if(contact[currMap.sfdcField] == candidateCard[currMap.tbirdField]){
                str += Number(currMap.strength);
            }
        }
        return str;
    },
    
    logProps: function(obj){
        var msg = "";
        for(prop in obj){
            msg += prop + ", "
        }
        GriffinCommon.log(msg, true, false, false);
    }
};

// Make sure sforce connection is available on all pages.
if(sforce || sforce != null || sforce != undefined){
}
else{
    var sforce = GriffinCommon.getFirstOpener().sforce;
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