var FieldInfo = function(prop, label, fieldId){
    this.fieldId = fieldId;
    this.prop = prop;
    this.label = label == null ? prop : label;
}

var GriffinOptions = {

    
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
                    GriffinCommon.log("Failed to get string for label " + dbLabel + " with error " + e, true, false, true);
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
    
    getSfdcFieldsDropDown: function(obj){
        if(GriffinOptions["fieldsDrop_" + obj]){
            return;
        }
        if(!GriffinCommon.ensureLogin()){
            GriffinOptions["fieldsDrop_" + obj] = document.createElement("textbox");
        }
        var result = sforce.connection.describeSObject(obj, {
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
                GriffinCommon.log(e, true, false, true);
                GriffinOptions["fieldsDrop_" + obj] = null;
            }
        });
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
        GriffinOptions.startAppendFieldMap("Contact", "cnctMapping");
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
        var rep = mDBConn.createStatement("Replace Into FieldMap (fieldId, sfdcField, strength) Values (?1, ?2, ?3)");
        var del = mDBConn.createStatement("Delete From FieldMap Where fieldId = ?1");
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
        if(!GriffinOptions["fieldsDrop_" + obj]){
            window.setTimeout("GriffinOptions.appendFieldMap('" + obj + "', '" + id + "');", 100);
            return;
        }
        var fieldsDrop = GriffinOptions["fieldsDrop_" + obj];
        // Contact field mapping
        var vBox = document.getElementById(id);
        var mDBConn = GriffinCommon.getDbConnection();
        var statement = mDBConn.createStatement("SELECT sfdcField, strength FROM FieldMap WHERE fieldId = ?1");
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
                
                var sfdcField = "";
                var strength = "";
                statement.bindInt32Parameter(0, currCardProp.fieldId);
                if(statement.executeStep()){
                    sfdcField = statement.getString(0);
                    strength = statement.getDouble(1);
                }
                statement.reset();
                
                // Field setup
                ddlField.id = "fld_" + currCardProp.fieldId;
                GriffinOptions.setSelected(ddlField, sfdcField);
                
                // Strength setup
                txtStrength.id = "str_" + currCardProp.fieldId;
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
        vBox.setAttribute("class", "");
    },
    
    startAppendFieldMap: function(obj, id){
        GriffinOptions.getSfdcFieldsDropDown(obj);
        GriffinOptions.appendFieldMap(obj, id);
    },
    
    initTaskPanel: function(){
        GriffinOptions.startAppendFieldMap("Task", "taskMapping");
    },
    
    onLoad: function() {
        try{
            GriffinOptions.initContactPanel();
            GriffinOptions.initTaskPanel();
        } catch (e) {
            GriffinCommon.log(e, true, false, true);
        }
    }
    
};

window.addEventListener("load", GriffinOptions.onLoad, false);

// Sample taken from http://www.mozilla.org/rdf/doc/rdf-all-resources-example.html
// may help to dump rdf contents