var FieldInfo = function(prop, label, fieldId){
    this.fieldId = fieldId;
    this.prop = prop;
    this.label = label == null ? prop : label;
}

var GriffinOptions = {    
    onLoad: function() {
        try{
            // try to log in. if unsuccessful give up. avoids attempts to log in from two panels at once.
            GriffinCommon.ensureLogin(
                function(){                
                    GriffinOptions.initGeneralPanel();
                    GriffinOptions.initContactPanel();
                    GriffinOptions.initTaskPanel();
                }
            );
        } catch (e) {
            Griffin.Logger.log(e, true, false, true);
        }
    }, 
    
    toggleCrm: function() {
        if(window.confirm("This will immediately change your selected crm system. Are you sure?")){
            var selCrm = document.getElementById("mlSelectedCRM").selectedItem.value;
            Griffin.Prefs.setPrefValue("crmSystem", selCrm, "string");
            GriffinCommon.api = Griffin.CrmApi.GetApi(selCrm);
            GriffinOptions.setLoginParams(selCrm);
            GriffinOptions.initContactPanel();
            GriffinOptions.initTaskPanel();
            return true;
        }
        else{            
            var selCrm = Griffin.Prefs.getPrefValue("crmSystem", "string");
            document.getElementById("mlSelectedCRM").selectedItem = document.getElementById("miCrm" + selCrm);
            return false;
        }
    },
    
    initGeneralPanel: function(){
        var selCrm = Griffin.Prefs.getPrefValue("crmSystem", "string");
        document.getElementById("mlSelectedCRM").selectedItem = document.getElementById("miCrm" + selCrm);
        GriffinOptions.setLoginParams(selCrm);
    },
    
    setLoginParams: function(selCrm){        
        var url = Griffin.Prefs.getPrefValue(selCrm + ".serverUrl", "string");
        var credentials = GriffinCommon.getCredentialsForUrl(url);
        document.getElementById("serverUrl").value = url;
        if(credentials != null){
            document.getElementById("username").value = credentials.user;
            document.getElementById("password").value = credentials.password;
            document.getElementById("rememberMe").checked = true;
        }
    },
            
    initContactPanel: function(){
    
        // Other contact options
        document.getElementById("synchDeleted").checked = Griffin.Prefs.getPrefValue("propogateDeletions", "bool");
        document.getElementById("synchDir").selectedItem = document.getElementById("synchDir_" + Griffin.Prefs.getPrefValue("synchContactDir", "string"));
        document.getElementById("synchOwn").selectedItem = document.getElementById("synchOwn_" + Griffin.Prefs.getPrefValue("synchContactOwnedBy", "string"));
        document.getElementById("synchFreq").value = Griffin.Prefs.getPrefValue("synchContactFrequency", "int");
        GriffinOptions.populateSynchAddrBook();
        
        // Contact field mapping
        GriffinOptions.startAppendFieldMap("Contact", "cnctMapping");
    },
    
    initTaskPanel: function(){
        GriffinOptions.startAppendFieldMap("Task", "taskMapping");
    },
    
    populateSynchAddrBook: function(){
        var lbSynchAddrBook = document.getElementById("synchAddrBook");
        var addressBooks = GriffinCommon.getAddressBooks();
        var regIdClean = /[^-_:A-Za-z0-9]/g;
        for(var i = 0; i < addressBooks.length; i++){
            var currAb = addressBooks[i];
            var li = document.createElement("listitem");
            li.setAttribute("id", "synchAddrBook_" + currAb.directoryProperties.URI.replace(regIdClean, ''));
            li.setAttribute("value", currAb.directoryProperties.URI);
            li.setAttribute("label", currAb.dirName);
            lbSynchAddrBook.appendChild(li);
        }
        var synchAddrBook = Griffin.Prefs.getPrefValue("synchAddrBook", "string");
        lbSynchAddrBook.selectedItem = document.getElementById("synchAddrBook_" + synchAddrBook.replace(regIdClean, ''));
    },
    
    loginClick: function(){
        var selCrm = document.getElementById("mlSelectedCRM").value;
        var api = Griffin.CrmApi.GetApi(selCrm);
        var username = document.getElementById("username").value;
        var password = document.getElementById("password").value;
        var url = document.getElementById("serverUrl").value;
        try{
            if(api.login(username, password))
            {
                Griffin.Logger.log("Log in complete.");
                
                Griffin.Prefs.setPrefValue("crmSystem", selCrm, "string");
                Griffin.Prefs.setPrefValue(selCrm + ".serverUrl", url, "string");
                if(document.getElementById("rememberMe").checked){
                    // TODO: Password manager - do we need to remove current login for this url before adding a new one?
                    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
                    passwordManager.addUser(url, username, password);
                }
                GriffinCommon.api = api;
            }
            else{
                Griffin.Logger.log("Login failed for user " + username + " at Url " + url, true, false, true);
            }
        }
        catch(err){
            Griffin.Logger.log("Login failed for user " + username + " at Url " + url + " with error " + err, true, false, true);
        }
    },
    
    tbirdProps: function(obj){        
        var mDBConn = GriffinCommon.getDbConnection();
        var statement = mDBConn.createStatement("SELECT fieldId, tbirdField, label FROM TBirdFields WHERE object = '" + obj + "'");
        var props = [];
        var bundle_options = document.getElementById('bundle_options');
        try{            
            while(statement.executeStep()){
                var fieldId = statement.getInt32(0);
                var field = statement.getString(1);
                var dbLabel = statement.getString(2);
                var label = field;
                try{
                    var label = bundle_options.getString(dbLabel);
                }
                catch(e)
                {
                    // TODO: Globalise
                    Griffin.Logger.log("Failed to get string for label " + dbLabel + " with error " + e, true, false, true);
                }
                props.push(new FieldInfo(field, label, fieldId));
            }
            statement.reset();
        }
        finally{
            statement.reset();
        }
        return props;
    },
    
    getFieldsDropDown: function(obj){
        if(!GriffinCommon.api.isLoggedIn){
            GriffinOptions["fieldsDrop_" + obj] = document.createElement("textbox");
        }
        else{
            try{
                var myObj = GriffinCommon.getCrmObjectFromTbirdObject(obj);
                var fields = GriffinCommon.api.getFields(myObj, function(fields){                
                    var menulist = document.createElement("menulist");
                    //TODO: Find a slick way of making constant values be inserted into crm / tbird? Make use of editable menulists?? Could change to 2 drop downs instead of current static list + drop down? (nice idea :-)
                    //TODO: Enforce one-to-one relationship for field mappings.
                    //menulist.setAttribute("editable", "true");
                    var menupopup = document.createElement("menupopup");
                    menulist.appendChild(menupopup);
                    var menuitem = document.createElement("menuitem");
                    menuitem.setAttribute("label", "Not Mapped"); // Globalise!
                    menuitem.setAttribute("value", "");
                    menupopup.appendChild(menuitem);
                    for(var i = 0; i < fields.length; i++){
                        var currField = fields[i];
                        var menuitem = document.createElement("menuitem");
                        menuitem.setAttribute("label", currField.label);
                        menuitem.setAttribute("value", currField.name);
                        menupopup.appendChild(menuitem);
                    }
                    GriffinOptions["fieldsDrop_" + obj] = menulist;
                });
            }
            catch(e){
                Griffin.Logger.log(e, true, false, true);
                GriffinOptions["fieldsDrop_" + obj] = document.createElement("textbox");
            }
        }
        
        /*
        {
            onSuccess: function(result){
                var menulist = document.createElement("menulist");
                var menupopup = document.createElement("menupopup");
                menulist.appendChild(menupopup);
                var menuitem = document.createElement("menuitem");
                menuitem.setAttribute("label", "Not Mapped"); // Globalise!
                menuitem.setAttribute("value", "");
                menupopup.appendChild(menuitem);
                for(var i = 0; i < result.fields.length; i++){
                    var currField = result.fields[i];
                    var menuitem = document.createElement("menuitem");
                    menuitem.setAttribute("label", currField.label);
                    menuitem.setAttribute("value", currField.name);
                    menupopup.appendChild(menuitem);
                }
                GriffinOptions["fieldsDrop_" + obj] = menulist;
            },
            onFailure: function(e){
                Griffin.Logger.log(e, true, false, true);
                GriffinOptions["fieldsDrop_" + obj] = document.createElement("textbox");
            }
        });
        */
    },
    
    setSelected: function(menulist, val){
        if(menulist.nodeName == "textbox"){ 
            menulist.valueOf = val;
            return;
        }
        else{
            for(var i = 0; i < menulist.firstChild.childNodes.length; ++i){
                var currItem = menulist.firstChild.childNodes[i];
                if(currItem.getAttribute("value") == val){
                    menulist.selectedIndex = i;
                    break;
                }
            }
        }
    },
    
    resetLastSynch: function(){
        Griffin.Prefs.setPrefValue("lastSynch", "100", "string");
        alert("Next contact synchronisation will be full!");
    },
    
    displayMessage: function(msg){
        document.getElementById("errors").appendChild(document.createTextNode(msg));
    },
    
    validate: function(){
        document.getElementById("errors").nodeValue = "";
        var valid = true;
        
        // Check Frequency value is an integer.
        var freq = parseInt(document.getElementById("synchFreq").value);
        if(isNaN(freq) || freq < 0){
            valid = false;
            // TODO: Globalise
            GriffinOptions.displayMessage("Synch frequency must be a (positive) number.");
        }
        
        // TODO: Validate numeric-ness of strength fields.
        // TODO: Validate Id field mapped?
        
        return valid;
    },
    
    updateFieldMap: function(obj){    
        var crmId = GriffinCommon.executeScalar("SELECT CRMId FROM CRM Where CRMName = '" + GriffinCommon.api.crmName + "'");
        var mDBConn = GriffinCommon.getDbConnection();
        var rep = mDBConn.createStatement("Replace Into FieldMap (fieldId, crmField, strength, CRMId) Values (?1, ?2, ?3, " + crmId + ")");
        var del = mDBConn.createStatement("Delete From FieldMap Where fieldId = ?1 And CRMId = " + crmId);
        try{
            var props = GriffinOptions.tbirdProps(obj);
            for(var i = 0; i < props.length; i++){
                
                var currCardProp = props[i];
                var fld = document.getElementById("fld_" + currCardProp.fieldId).value;
                var str = document.getElementById("str_" + currCardProp.fieldId).value;
                var statement;
                if(fld.length == 0){
                    statement = del;
                }
                else{
                    statement = rep;
                    statement.bindUTF8StringParameter(1, fld);
                    statement.bindInt32Parameter(2, str);
                }
                statement.bindInt32Parameter(0, currCardProp.fieldId);
                statement.execute();
                statement.reset();
            }
        }
        finally{
            // Yes I know I'm resetting one too many times 99.99% of the time - safety first. Sue me.
            rep.reset();
            del.reset();
        }
    },
    
    startAppendFieldMap: function(obj, id){
        GriffinOptions["fieldsDrop_" + obj] = undefined;
        GriffinOptions.getFieldsDropDown(obj);
        GriffinOptions.appendFieldMap(obj, id);
    },
    
    appendFieldMap: function(obj, id){
        if(!GriffinOptions["fieldsDrop_" + obj]){
            window.setTimeout("GriffinOptions.appendFieldMap('" + obj + "', '" + id + "');", 100);
            return;
        }
        var fieldsDrop = GriffinOptions["fieldsDrop_" + obj];
        // Contact field mapping
        var vBox = document.getElementById(id);
        var mDBConn = GriffinCommon.getDbConnection();
        var statement = mDBConn.createStatement("SELECT f.crmField, f.strength FROM FieldMap f, CRM c WHERE fieldId = ?1 And c.CRMId = f.CRMId And c.CRMName = '" + GriffinCommon.api.crmName + "'");
        var properties = GriffinOptions.tbirdProps(obj);
        try{
            for(var i = 0; i < properties.length; i++){
                var currCardProp = properties[i];
                var li = document.createElement("hbox");
                var label = document.createElement("label");
                var labelText = document.createTextNode(currCardProp.label);
                var spacer = document.createElement("spacer");
                var ddlField = fieldsDrop.cloneNode(true);
                var txtStrength = document.createElement("textbox");
                
                // Label props
                label.appendChild(labelText);
                spacer.setAttribute("flex", "1");
                
                var crmField = "";
                var strength = "";
                statement.bindInt32Parameter(0, currCardProp.fieldId);
                if(statement.executeStep()){
                    crmField = statement.getString(0);
                    strength = statement.getDouble(1);
                }
                statement.reset();
                
                // Field setup
                ddlField.id = "fld_" + currCardProp.fieldId;
                GriffinOptions.setSelected(ddlField, crmField);
                
                // Strength setup
                txtStrength.id = "str_" + currCardProp.fieldId;
                txtStrength.setAttribute("value", strength);
                
                li.appendChild(label);
                li.appendChild(spacer);
                li.appendChild(ddlField);
                li.appendChild(txtStrength);
                var oldNode = document.getElementById("li_" + currCardProp.fieldId);          
                li.setAttribute("id", "li_" + currCardProp.fieldId);
                if(oldNode == null){
                    vBox.appendChild(li);
                }
                else{
                    vBox.replaceChild(li, oldNode);
                }
            }
        } finally {
          statement.reset();
        }
        vBox.setAttribute("class", "");
    },
    
    savePrefs: function(){
        if(! GriffinOptions.validate()){
            return false;
        }
        // Update database field mappings.
        GriffinOptions.updateFieldMap("Contact");
        GriffinOptions.updateFieldMap("Task");
        // Update other prefs.
        Griffin.Prefs.setPrefValue("propogateDeletions", document.getElementById("synchDeleted").checked, "bool");
        Griffin.Prefs.setPrefValue("synchContactDir", document.getElementById("synchDir").selectedItem.value, "string");
        Griffin.Prefs.setPrefValue("synchContactOwnedBy", document.getElementById("synchOwn").selectedItem.value, "string");
        Griffin.Prefs.setPrefValue("synchContactFrequency", document.getElementById("synchFreq").value, "int");
        Griffin.Prefs.setPrefValue("synchAddrBook", document.getElementById("synchAddrBook").selectedItem.value, "string");
        // We may have changed the frequency, so reschedule the synchronisation on the main page.
        getFirstOpener().GriffinMessage.scheduleSynch();
        return true;
    }
    
};

window.addEventListener("load", GriffinOptions.onLoad, false);

// Sample taken from http://www.mozilla.org/rdf/doc/rdf-all-resources-example.html
// may help to dump rdf contents