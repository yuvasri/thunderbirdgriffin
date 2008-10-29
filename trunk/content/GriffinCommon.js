var GriffinCommon = {
    extensionId: "griffin@mpbsoftware.com",
    databasefile: "griffin.sqlite",   
    
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
                            GriffinCommon.log('Stored login for ' + queryString + ' failed with error ' + e);
                         }
                         break;
                    }
                } catch (ex) {
                    continue;
                }
            }  
            if(sforce.connection.sessionId == null){                
                var dialog = window.openDialog('chrome://griffin/content/login.xul', '_blank', 'modal');
            }
        }
        return sforce.connection.sessionId != null;
    },
    
    getContactFieldMap: function(){    
        var connection = GriffinCommon.getDbConnection();
        var statement = connection.createStatement("SELECT tBirdField, sfdcField FROM FieldMap WHERE object = 'Contact'");
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
    
    log: function(msg){       
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        consoleService.logStringMessage(msg);
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
            // Above functions will throw NS_ERROR_UNEXPECTED on unset prefs. Return null and let consumer pick a default.
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
    }
};

// Make sure sforce connection is available on all pages.
if(sforce || sforce != null || sforce != undefined){
}
else{
    var sforce = GriffinCommon.getFirstOpener().sforce;
}