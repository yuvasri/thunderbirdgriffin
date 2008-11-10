// TODO: Cache varous XPCOM classes used in this file - Performance?

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
            //alert('opener.location.href: ' + opener.location.href + '\r\nlast.location.href: ' + last.location.href);
        } while(opener != null && opener.location && opener.location.href != last.location.href);
        return last;
    },
    
    ensureLogin: function(){   
        var status = document.getElementById("gfn_status");
        if(status != null){     
            status.setAttribute("label", "Logging in...");
        }
        if(sforce.connection.sessionId == null){
            var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
                                
             // the host name of the password we are looking for
            var queryString = sforce.connection.serverUrl;
            // ask the password manager for an enumerator:
            var e = passwordManager.enumerator;
            // step through each password in the password manager until we find the one we want:
            while (e.hasMoreElements()) {
                try {
                    // get an nsIPassword object out of the password manager.
                    // This contains the actual password...
                    var pass = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
                    if (pass.host == queryString) {
                         // found it! (Hopefully!!)
                         try{
                            var loginResult = sforce.connection.login(pass.user, pass.password);
                            sforce.connection.serverUrl = loginResult.serverUrl;      
                         } catch (e) {
                            // TODO: Globalise.
                            GriffinCommon.log('Stored login for ' + queryString + ' failed with error ' + e, true, false, true);
                         }
                         break;
                    }
                } catch (ex) {
                    continue;
                }
            }  
            // No password saved. Login using the dialog box.
            if(sforce.connection.sessionId == null){                
                var dialog = window.openDialog('chrome://griffin/content/login.xul', '_blank', 'modal');
            }
        }
        // May have still not logged in (eg cancelled the login dialog).
        var hasLoggedIn = sforce.connection.sessionId != null;                              
        if(status != null){
            if(hasLoggedIn){
                // TODO: Globalise
                status.setAttribute("label", "Login successful...");
            }
            else{
                // TODO: Globalise
                status.setAttribute("label", "Login failed. See Error Console for details.");                
            }
        }
        return hasLoggedIn
    },
    
    getFieldMap: function(obj){    
        var connection = GriffinCommon.getDbConnection();
        var statement = connection.createStatement("SELECT tBirdField, sfdcField FROM FieldMap fm, TBirdFields t WHERE t.fieldId = fm.fieldId AND t.object = '" + obj + "'");
        var fieldMap = [];
        try{
            while(statement.executeStep()){
                var s_tBirdField = statement.getUTF8String(0);
                var s_sfdcField = statement.getUTF8String(1);
                fieldMap.push( { tBirdField: s_tBirdField, sfdcField: s_sfdcField });
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
    
    getOptionVal: function(option){
        var connection = GriffinCommon.getDbConnection();
        var command = connection.createStatement("SELECT Value FROM Option WHERE Name = ?1");
        try{
            command.bindUTF8StringParameter(0, option);
            if(command.executeStep() && !command.getIsNull(0)){
            
                return command.getUTF8String(0);
            }      
        }
        finally {
            command.reset();
        }
        return "";
    },
 
    log: function(msg, error, status, persist){       
        if(error){
            var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
            // TODO: Use nsIConsoleMessage interface of @mozilla.org/scripterror;1 for logging to error console.
            consoleService.logStringMessage(msg);
        }
        if(status){
            var statusPanel = document.getElementById("gfn_status");
            if(statusPanel != null){
                statusPanel.setAttribute("label", msg);
            }
        }
        if(persist){
            // TODO: Make this work!!
            var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
            var logFile = em.getInstallLocation(GriffinCommon.extensionId).getItemFile(GriffinCommon.extensionId, GriffinCommon.logFile);
            if(!logFile.exists()){
                // 468 (dec) = 666 (oct) -> rw permissions for all users? How did I calculate this? http://www.robolink.co.uk/calculators10.htm
                logFile.create(logFile.NORMAL_FILE_TYPE, 438);
            }
            var obj = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
            obj.init(logFile, -1, -1, 0);
            obj.write(msg, msg.length);
            obj.close();
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
    
    // TODO: Perhaps this should be somewhere else? Called on both addMessage, and synchContact methods.
    getCardForContact: function(contact, fieldMaps){
        var queryString = "?(or";
        for(var currMapIdx = 0; currMapIdx < fieldMaps.length; ++currMapIdx){
            if(currMapIdx > 0)
                queryString += ",";
            var currMap = fieldMaps[currMapIdx];
            queryString += "(" + currMap.tbirdField + ",c," + contact[currMap.sfdcField] + ")"
        }
        queryString += ")";
        var candidates = [];
        var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
        // enumerate all of the address books on this system
        var parentDir = rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
        var enumerator = parentDir.childNodes;
        while (enumerator.hasMoreElements()) {
            var addrbook = enumerator.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
            var childCards = addrbook.childNodes;            
            while (childCards.hasMoreElements()) {
                var card = childCards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
                candidates.push({Card: card, Directory: addrbook.directoryProperties.URI});
            }
        }
        return GriffinCommon.getBestMatch(fieldMaps, candidates);
    },
    
    // TODO: Perhaps this should be somewhere else? See getCardForContact
    getBestMatch: function(fieldMaps, possibleMatches, contact){
        var bestMatchValue = 0;
        var bestMatch = null;
        for(var idx = 0; idx < possibleMatches.length; possibleMatches++){
            var matchStrength = GriffinCommon.getMatchStrength(fieldMaps, possibleMatches[idx].Card);
            if(matchStrength > bestMatchValue){
                bestMatch = possibleMatches[idx];
                bestMatchValue = matchStrength;
            }
        }
        return bestMatch;
    },
    
    // TODO: Perhaps this should be somewhere else? See getCardForContact
    getMatchStrength: function(fieldMaps, candidateCard, contact){
        var str = 0;
        for(var mapIdx = 0; mapIdx < fieldMaps.length; mapIdx++){
            var currMap = fieldMaps[mapIdx];
            if(contact[currMap.sfdcField] == candidateCard[currMap.tbirdField]){
                str += currMap.strength;
            }
        }
        return str;
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

// Lifted from http://mb.eschew.org/16#sub_16.7
function dumpFromRoot(ds, rootURI)
{
  return _dumpFactSubtree(ds, rootURI, 0);
}
*/