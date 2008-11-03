FieldInfo = function(prop, type, obj){
    this.prop = prop;
    this.type = type;
    try{
        this.label = document.getElementById("bundle_options").getString(obj + "." + prop);
    }
    catch(e)
    {
        this.label = prop;
    }
}

var GriffinOptions = {

    
    abCardProps: [
        new FieldInfo("firstName", "prop", "Contact"),
        new FieldInfo("lastName", "prop", "Contact"),
        new FieldInfo("phoneticFirstName", "prop"), "Contact",
        new FieldInfo("phoneticLastName", "prop", "Contact"),
        new FieldInfo("displayName", "prop", "Contact"),
        new FieldInfo("nickName", "prop", "Contact"),
        new FieldInfo("primaryEmail", "prop", "Contact"),
        new FieldInfo("secondEmail", "prop", "Contact"),
        new FieldInfo("workPhone", "prop", "Contact"),
        new FieldInfo("homePhone", "prop", "Contact"),
        new FieldInfo("faxNumber", "prop", "Contact"),
        new FieldInfo("pagerNumber", "prop", "Contact"),
        new FieldInfo("cellularNumber", "prop", "Contact"),
        new FieldInfo("workPhoneType", "prop", "Contact"),
        new FieldInfo("homePhoneType", "prop", "Contact"),
        new FieldInfo("faxNumberType", "prop", "Contact"),
        new FieldInfo("pagerNumberType", "prop", "Contact"),
        new FieldInfo("cellularNumberType", "prop", "Contact"),
        new FieldInfo("homeAddress", "prop", "Contact"),
        new FieldInfo("homeAddress2", "prop", "Contact"),
        new FieldInfo("homeCity", "prop", "Contact"),
        new FieldInfo("homeState", "prop", "Contact"),
        new FieldInfo("homeZipCode", "prop", "Contact"),
        new FieldInfo("homeCountry", "prop", "Contact"),
        new FieldInfo("workAddress", "prop", "Contact"),
        new FieldInfo("workAddress2", "prop", "Contact"),
        new FieldInfo("workCity", "prop", "Contact"),
        new FieldInfo("workState", "prop", "Contact"),
        new FieldInfo("workZipCode", "prop", "Contact"),
        new FieldInfo("workCountry", "prop", "Contact"),
        new FieldInfo("jobTitle", "prop", "Contact"),
        new FieldInfo("department", "prop", "Contact"),
        new FieldInfo("company", "prop", "Contact"),
        new FieldInfo("aimScreenName", "prop", "Contact"),
        new FieldInfo("anniversaryYear", "prop", "Contact"),
        new FieldInfo("anniversaryMonth", "prop", "Contact"),
        new FieldInfo("anniversaryDay", "prop", "Contact"),
        new FieldInfo("spouseName", "prop", "Contact"),
        new FieldInfo("familyName", "prop", "Contact"),
        new FieldInfo("defaultAddress", "prop", "Contact"),
        new FieldInfo("category", "prop", "Contact"),
        new FieldInfo("webPage1", "prop", "Contact"),
        new FieldInfo("webPage2", "prop", "Contact"),
        new FieldInfo("birthYear", "prop", "Contact"),
        new FieldInfo("birthMonth", "prop", "Contact"),
        new FieldInfo("birthDay", "prop", "Contact"),
        new FieldInfo("custom1", "prop", "Contact"),
        new FieldInfo("custom2", "prop", "Contact"),
        new FieldInfo("custom3", "prop", "Contact"),
        new FieldInfo("custom4", "prop", "Contact"),
        new FieldInfo("notes", "prop", "Contact"),
        new FieldInfo("lastModifiedDate", "prop", "Contact"),
        new FieldInfo("popularityIndex", "prop", "Contact"),
        new FieldInfo("preferMailFormat", "prop", "Contact"),
        new FieldInfo("isMailList", "prop", "Contact"),
        new FieldInfo("mailListURI", "prop", "Contact"),
        new FieldInfo("allowRemoteContent", "prop", "Contact")
    ],
   
    msgProps: [
        // Properties
        new FieldInfo("isRead", "prop", "Task"),
        new FieldInfo("isFlagged", "prop", "Task"),
        new FieldInfo("priority", "prop", "Task"),
        new FieldInfo("flags", "prop", "Task"),
        new FieldInfo("threadId", "prop", "Task"),
        new FieldInfo("messageKey", "prop", "Task"),
        new FieldInfo("threadParent", "prop", "Task"),
        new FieldInfo("messageSize", "prop", "Task"),
        new FieldInfo("lineCount", "prop", "Task"),
        new FieldInfo("statusOffset", "prop", "Task"),
        new FieldInfo("messageOffset", "prop", "Task"),
        new FieldInfo("offlineMessageSize", "prop", "Task"),
        new FieldInfo("date", "prop", "Task"),
        new FieldInfo("dateInSeconds", "prop", "Task"),
        new FieldInfo("messageId", "prop", "Task"),
        new FieldInfo("ccList", "prop", "Task"),
        new FieldInfo("author", "prop", "Task"),
        new FieldInfo("subject", "prop", "Task"),
        new FieldInfo("recipients", "prop", "Task"),
        new FieldInfo("numReferences", "prop", "Task"),
        new FieldInfo("mime2DecodedAuthor", "prop", "Task"),
        new FieldInfo("mime2DecodedSubject", "prop", "Task"),
        new FieldInfo("mime2DecodedRecipients", "prop", "Task"),
        new FieldInfo("Charset", "prop", "Task"),
        new FieldInfo("label", "prop", "Task"),
        new FieldInfo("accountKey", "prop", "Task"),
        new FieldInfo("folder", "prop", "Task"),
        // Methods
        new FieldInfo("GriffinMessage.body", "method", "Task")
    ],
    
    getSfdcFieldsDropDown: function(obj){
        if(!GriffinCommon.ensureLogin()){
            return document.createElement("textbox");
        }
        var result = sforce.connection.describeSObject(obj);
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
        return menulist;
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
        
    initContactPanel: function(){
    
        // Contact field mapping
        GriffinOptions.appendFieldMap("Contact", "cnctMapping");
        // Other contact options
        document.getElementById("synchDeleted").checked = GriffinCommon.getPrefValue("propogateDeletions", "bool");
        document.getElementById("synchDir").selectedItem = document.getElementById("synchDir_" + GriffinCommon.getPrefValue("synchContactDir", "string"));
        document.getElementById("synchOwn").selectedItem = document.getElementById("synchOwn_" + GriffinCommon.getPrefValue("synchContactOwnedBy", "string"));
        document.getElementById("synchFreq").value = GriffinCommon.getPrefValue("synchContactFrequency", "int");
    },
    
    resetLastSynch: function(){
        GriffinCommon.setPrefValue("lastSynch", "0", "string");
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
            GriffinOptions.displayMessage("Synch frequency must be a (positive) number.");
        }
        
        // TODO: Validate numeric-ness of strength fields.
        // TODO: Validate strength fields sum to 100??
        // TODO: Validate Id field mapped?
        
        return valid;
    },
    
    updateFieldMap: function(obj){    
        var mDBConn = GriffinCommon.getDbConnection();
        var rep = mDBConn.createStatement("Replace Into FieldMap (object, tbirdField, sfdcField, strength) Values ('" + obj + "', ?1, ?2, ?3)");
        var del = mDBConn.createStatement("Delete From FieldMap Where tbirdField = ?1 And object = '" + obj + "'");
        try{
            for(var i = 0; i < GriffinOptions.abCardProps.length; i++){
                
                var currCardProp = GriffinOptions.abCardProps[i];
                var fld = document.getElementById("fld_" + obj + "_" + currCardProp.prop).value;
                var str = document.getElementById("str_" + obj + "_" + currCardProp.prop).value;
                var statement;
                if(fld.length == 0){
                    statement = del;
                }
                else{
                    statement = rep;
                    statement.bindUTF8StringParameter(1, fld);
                    statement.bindInt32Parameter(2, str);
                }
                statement.bindUTF8StringParameter(0, currCardProp.prop);
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
    
    savePrefs: function(){
        if(! GriffinOptions.validate()){
            return false;
        }
        GriffinOptions.updateFieldMap("Contact");
        GriffinOptions.updateFieldMap("Task");
        GriffinCommon.setPrefValue("propogateDeletions", document.getElementById("synchDeleted").checked, "bool");
        GriffinCommon.setPrefValue("synchContactDir", document.getElementById("synchDir").selectedItem.value, "string");
        GriffinCommon.setPrefValue("synchContactOwnedBy", document.getElementById("synchOwn").selectedItem.value, "string");
        GriffinCommon.setPrefValue("synchContactFrequency", document.getElementById("synchFreq").value, "int");
        // We may have changed the frequency, so reschedule the synchronisation on the main page.
        GriffinCommon.getFirstOpener().GriffinMessage.scheduleSynch();
        // Now update database field mappings.
        return true;
    },
    
    appendFieldMap: function(obj, id){
        // Contact field mapping
        var vBox = document.getElementById(id);
        var mDBConn = GriffinCommon.getDbConnection();
        var statement = mDBConn.createStatement("SELECT sfdcField, strength FROM FieldMap WHERE object = '" + obj + "' AND tbirdField = ?1");
        var fieldsDrop = GriffinOptions.getSfdcFieldsDropDown(obj);
        try{
            for(var i = 0; i < GriffinOptions.abCardProps.length; i++){
                var currCardProp = GriffinOptions.abCardProps[i];
                var li = document.createElement("hbox");
                var label = document.createElement("label");
                var labelText = document.createTextNode(currCardProp.label);
                var spacer = document.createElement("spacer");
                var ddlField = fieldsDrop.cloneNode(true);
                var txtStrength = document.createElement("textbox");
                
                // Label props
                label.appendChild(labelText);
                spacer.setAttribute("flex", "1");
                
                var sfdcField = "";
                var strength = "";
                statement.bindUTF8StringParameter(0, currCardProp.label);
                if(statement.executeStep()){
                    sfdcField = statement.getString(0);
                    strength = statement.getDouble(1);
                }
                statement.reset();
                
                // Field setup
                ddlField.id = "fld_" + obj + "_" + currCardProp.prop;
                GriffinOptions.setSelected(ddlField, sfdcField);
                
                // Strength setup
                txtStrength.id = "str_" + obj + "_" + currCardProp.prop;
                txtStrength.setAttribute("value", strength);
                
                li.appendChild(label);
                li.appendChild(spacer);
                li.appendChild(ddlField);
                li.appendChild(txtStrength);
                vBox.appendChild(li);
            }
        } finally {
          statement.reset();
        }
    },
    
    initTaskPanel: function(){
        GriffinOptions.appendFieldMap("Task", "taskMapping");
    },
    
    onLoad: function() {
        GriffinOptions.initContactPanel();
        GriffinOptions.initTaskPanel();
    }
    
};

window.addEventListener("load", GriffinOptions.onLoad, false);



// Sample taken from http://www.mozilla.org/rdf/doc/rdf-all-resources-example.html
// may help to dump rdf contents