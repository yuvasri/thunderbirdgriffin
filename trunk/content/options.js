var GriffinOptions = {
    abCardProps: [
    'firstName',
    'lastName',
    'phoneticFirstName',
    'phoneticLastName',
    'displayName',
    'nickName',
    'primaryEmail',
    'secondEmail',
    'workPhone',
    'homePhone',
    'faxNumber',
    'pagerNumber',
    'cellularNumber',
    'workPhoneType',
    'homePhoneType',
    'faxNumberType',
    'pagerNumberType',
    'cellularNumberType',
    'homeAddress',
    'homeAddress2',
    'homeCity',
    'homeState',
    'homeZipCode',
    'homeCountry',
    'workAddress',
    'workAddress2',
    'workCity',
    'workState',
    'workZipCode',
    'workCountry',
    'jobTitle',
    'department',
    'company',
    'aimScreenName',
    'anniversaryYear',
    'anniversaryMonth',
    'anniversaryDay',
    'spouseName',
    'familyName',
    'defaultAddress',
    'category',
    'webPage1',
    'webPage2',
    'birthYear',
    'birthMonth',
    'birthDay',
    'custom1',
    'custom2',
    'custom3',
    'custom4',
    'notes',
    'lastModifiedDate',
    'popularityIndex',
    'preferMailFormat',
    'isMailList',
    'mailListURI',
    'allowRemoteContent'],
    
    getSfdcContactFieldsDropDown: function(){
        if(!GriffinCommon.ensureLogin()){
            return document.createElement("textbox");
        }
        var result = sforce.connection.describeSObject("Contact");
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
        var vBox = document.getElementById('cnctMapping');
        var mDBConn = GriffinCommon.getDbConnection();
        var statement = mDBConn.createStatement("SELECT sfdcField, strength FROM FieldMap WHERE object = 'Contact' AND tbirdField = ?1");
        var fieldsDrop = GriffinOptions.getSfdcContactFieldsDropDown();
        try{
            for(var i = 0; i < GriffinOptions.abCardProps.length; i++){
                var currCardProp = GriffinOptions.abCardProps[i];
                var li = document.createElement('hbox');
                var label = document.createElement('label');
                var labelText = document.createTextNode(currCardProp);
                var spacer = document.createElement('spacer');
                var ddlField = fieldsDrop.cloneNode(true);
                var txtStrength = document.createElement('textbox');
                
                                
                // Label props
                label.appendChild(labelText);
                spacer.setAttribute('flex', '1');
                
                var sfdcField = "";
                var strength = "";                
                statement.bindUTF8StringParameter(0, currCardProp);
                if(statement.executeStep()){
                    sfdcField = statement.getString(0);
                    strength = statement.getDouble(1);
                }
                statement.reset();
                
                // Field setup
                ddlField.id = "fld_" + currCardProp;
                GriffinOptions.setSelected(ddlField, sfdcField);
                
                // Strength setup
                txtStrength.id = "str_" + currCardProp;
                txtStrength.setAttribute('value', strength);
                
                li.appendChild(label);
                li.appendChild(spacer);
                li.appendChild(ddlField);
                li.appendChild(txtStrength);
                vBox.appendChild(li);
            }
        } finally {
          statement.reset();
        }
        
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
    
    savePrefs: function(){
        if(! GriffinOptions.validate()){
            return false;
        }
        
        GriffinCommon.setPrefValue("propogateDeletions", document.getElementById("synchDeleted").checked, "bool");
        GriffinCommon.setPrefValue("synchContactDir", document.getElementById("synchDir").selectedItem.value, "string");
        GriffinCommon.setPrefValue("synchContactOwnedBy", document.getElementById("synchOwn").selectedItem.value, "string");
        GriffinCommon.setPrefValue("synchContactFrequency", document.getElementById("synchFreq").value, "int");
        
        // Now update database field mappings.
        var mDBConn = GriffinCommon.getDbConnection();
        var rep = mDBConn.createStatement("Replace Into FieldMap (object, tbirdField, sfdcField, strength) Values ('Contact', ?1, ?2, ?3)");
        var del = mDBConn.createStatement("Delete From FieldMap Where tbirdField = ?1 And object = 'Contact'");
        try{
            for(var i = 0; i < GriffinOptions.abCardProps.length; i++){
                
                var currCardProp = GriffinOptions.abCardProps[i];
                var fld = document.getElementById('fld_' + currCardProp).value;
                var str = document.getElementById('str_' + currCardProp).value;
                var statement;
                if(fld.length == 0){
                    statement = del;
                }
                else{
                    statement = rep;
                    statement.bindUTF8StringParameter(1, fld);
                    statement.bindInt32Parameter(2, str);
                }
                statement.bindUTF8StringParameter(0, currCardProp);
                statement.execute();
                statement.reset();
            }
        }
        finally{
            // Yes I know I'm resetting one too many times 99.99% of the time - safety first. Sue me.
            rep.reset();
            del.reset();
        }
        return true;
    },
    
    initTaskPanel: function(){
//        var RDF = Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(); RDF = RDF.QueryInterface(Components.interfaces.nsIRDFService);
//        var msgaccountmanager = RDF.GetResource("rdf:msgaccountmanager");
//        var bob = dumpFromRoot(msgaccountmanager, "msgaccounts:/");
//        GriffinCommon.log(bob);
        var view = GetDBView();
        view.doCommand(nsMsgViewCommandType.expandAll);
        var fldrlocal = view.getFolderForViewIndex(0);
        var root = fldrlocal.rootFolder;
    },
    
    onLoad: function() {
        GriffinOptions.initContactPanel();
        GriffinOptions.initTaskPanel();
    }
    
};

window.addEventListener('load', GriffinOptions.onLoad, false);