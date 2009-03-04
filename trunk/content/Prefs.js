/**
File description.

Used to abstract the preferences API somewhat.
*/

if (!Griffin){
    var Griffin = {};
}

Griffin.Prefs = {};
        
Griffin.Prefs.getPrefValue = function(pref, type) {
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
};
    
Griffin.Prefs.setPrefValue = function(pref, value, type){
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
};