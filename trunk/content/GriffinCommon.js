﻿var GriffinCommon = {
    extensionId: "griffin@mpbsoftware.com",
    databasefile: "griffin.sqlite",
    
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
        var retVal = null;
        var connection = getDbConnection();
        var command = connection.createStatement("SELECT Value FROM Option WHERE Name = ?1");
        try{
            command.bindUTF8StringParameter(0, option);
            if(statement.executeStep() && !statement.getIsNull(0)){
            
                retVal = statement.getUTF8String(0);
            }      
        }
        finally {
            command.reset();
        }
    },
    
    log: function(msg){       
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        consoleServicelogStringMessage(msg);
    },
        
    getPrefValue: function(pref, type) {
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
    },
    
    setPrefValue: function(pref, value, type){        
        // Get the "extensions.griffin." branch
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        prefs = prefs.getBranch("extensions.griffin.");
        switch (type.toLowerCase()){
            case "string": prefs.setCharPref(pref, value);
            case "int": prefs.setIntPref(pref, value);
            case "bool": prefs.setBoolPref(pref, value);
            case "datetime": pref.setCharPref(pref, value);
            case "float": prefs.setCharPref(pref, value);
            default: prefs.setCharPref(pref, value);
        }
    }

};