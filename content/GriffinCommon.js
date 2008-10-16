var GriffinCommon = {
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