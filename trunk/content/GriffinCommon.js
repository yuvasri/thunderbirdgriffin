var GriffinCommon = {
    addMessageToSalesforce: function(){
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