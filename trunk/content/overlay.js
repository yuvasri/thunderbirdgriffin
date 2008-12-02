var GriffinMessage = { 
    synchCancelTimeout: false,
    synchCancel: null,
    synchFolder: null,

    gfn_folderListener: {
        timeout: null,
        addMessages: function(){
            //Griffin.Logger.log("gfn_folderListener.addMessages called.", true, false, true);
            GriffinMessage.gfn_folderListener.timeout = null;
            var enumerator = GriffinMessage.synchFolder.getMessages(msgWindow);
            var messages = [];
            while (enumerator.hasMoreElements()) {
                var hdr = enumerator.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
                messages.push(GriffinMessage.synchFolder.getUriForMsg(hdr));
            }
            // Add the messages with a callback to delete them from the folder.
            GriffinMessage.addMessages(messages, GriffinMessage.gfn_folderListener.deleteMessages);
        },
        
        deleteMessages: function(messages){
            var theMessages = Components.classes["@mozilla.org/supports-array;1"].createInstance(Components.interfaces.nsISupportsArray);
            for(var i = 0; i < messages.length; i++){
                theMessages.AppendElement(messages[i].innerMessage);
            }
            GriffinMessage.synchFolder.deleteMessages(theMessages, msgWindow, true, false, null, false);
        },
        
        //TODO: Hook OnItemAdded in folder listener, rather than the TotalMessages property changing. (applicable when listening to just synch folder). 
        OnItemIntPropertyChanged: function ( item , property ,oldValue , newValue ){        
            try{
                item.QueryInterface(Components.interfaces.nsIMsgFolder);
            }
            catch(e){
                // Must be a folder property change to be interesting.
                return;
            }
            if(property.toString() == "TotalMessages" && (newValue > oldValue) && item.URI == GriffinMessage.synchFolder.URI)
            {
                var timeout = Griffin.Prefs.getPrefValue("messageBatchingTimeout", "int");
                // Use a timeout to batch requests to salesforce. Messages will only be sent after a short time with no activity.
                if(GriffinMessage.gfn_folderListener.timeout != null)
                    window.clearTimeout(GriffinMessage.gfn_folderListener.timeout);
                GriffinMessage.gfn_folderListener.timeout = window.setTimeout("GriffinMessage.gfn_folderListener.addMessages();", timeout); 
            }
        }
    },
    
    getIdField: function(fieldMap){
        for(var i = 0; i < fieldMap.length; i++){
            if(fieldMap[i].sfdcField == "Id"){
                return fieldMap[i].tbirdField;
            }
        }
        return null;
    },
    
    // http://www.xulplanet.com/references/xpcomref/ifaces/nsIAbListener.html
    gfn_addressBookListener: {
    
        timeout: null,
        cardsToInsert: [],        
        cardsToUpdate: [],
    
        insertCardsSFDC: function(card){
           GriffinMessage.gfn_addressBookListener.timeout = null;
            if(!GriffinCommon.ensureLogin()) {
                return;
            }
            
            var synchContactDir = Griffin.Prefs.getPrefValue("synchContactDir", "string");
            if(synchContactDir == "BOTH" ||
                synchContactDir == "TBIRD") {
                var fieldMap = GriffinCommon.getFieldMap("Contact");
                var contacts = [];
                var cards = GriffinMessage.gfn_addressBookListener.cardsToSave;
                for(var i = 0; i < cards.length; i++){
                    contacts.push(GriffinMessage.gfn_addressBookListener.setContactVals(card, fieldMap));
                }
                var result;
                if(contact.Id.length > 0){
                    result = sforce.connection.update(contacts);
                }
                else{
                    result = sforce.connection.create([contact]);
                    if(result[0].getBoolean("success")){
                        // TODO: Deal with non-editable salesforce fields.
                        gEditCard.card[GriffinCard.getIdField(fieldMap)] = result[0].id;
                    }
                    else{
                        // TODO: Globalise?
                        Griffin.Logger.log("failed to create contact " + result[0], true, false, true);
                    }
                }
                return result[0].getBoolean("success");
            }
        },
    
        setContactVals: function(card, fieldMap){
            var contact = new sforce.SObject("Contact");
            for(var i = 0; i < fieldMap.length; i++){
                var currMapping = fieldMap[i];
                contact[currMapping.sfdcField] = card[currMapping.tbirdField];
            }
            return contact;
        },
    
        beginSaveCard: function(item){
            try{
                item.QueryInterface(Components.interfaces.nsIAbCard);
            }
            catch(e){
                // Not interested if it's not a card.
                return;
            }
            GriffinMessage.gfn_addressBookListener.cardsToSave.push(item);
            var timeout = Griffin.Prefs.getPrefValue("messageBatchingTimeout", "int");
            if(GriffinMessage.gfn_addressBookListener.timeout != null){
                window.clearTimeout(GriffinMessage.gfn_addressBookListener.timeout);
            }
            GriffinMessage.gfn_addressBookListener.timeout = window.setTimeout("GriffinMessage.gfn_addressBookListener.saveCardsToSFDC();", timeout);
        },      
    
        onItemAdded: function(parentDir, item ){
            Griffin.Logger.log("function: onItemAdded\nparentDir: " + parentDir + "\nitem: " + item, true);
        },
        
        onItemPropertyChanged: function(item, property, oldValue, newValue ){
            Griffin.Logger.log("function: onItemPropertyChanged\nitem: " + item + "\nproperty: " + property + "\noldValue: " + oldValue + "\nnewValue: " + newValue, true);
            try{
                item.QueryInterface(Components.interfaces.nsIAbCard);
            }
            catch(e){
                // Not interested if it's not a card.
                return;
            }
            GriffinMessage.gfn_addressBookListener.cardsToSave.push(item);
            var timeout = Griffin.Prefs.getPrefValue("messageBatchingTimeout", "int");
            GriffinMessage.gfn_addressBookListener.timeout = window.setTimeout("GriffinMessage.gfn_addressBookListener.saveCardsToSFDC();", timeout);
        },
        
        onItemRemoved: function(parentDir, item ){
            Griffin.Logger.log("function: onItemRemoved\nparentDir: " + parentDir + "\nitem: " + item, true);
            //TODO: Need to synch deletions between salesforce and thunderbird.
        }
    },

    ensureSalesforceSynchFolder: function(){
        var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
        var folderName = Griffin.Prefs.getPrefValue("synchFolderName", "string");
        var localFoldersRoot = accountManager.localFoldersServer.rootFolder;
        try{
            localFoldersRoot.createSubfolder (folderName, msgWindow);     
        }
        catch(err){
            // It has almost certainly been created. In which case createSubfolder will chuck a wobbler, which we can ignore.
        }
        var synchFolder = localFoldersRoot.getChildNamed(folderName); 
        
        // Neccessary, not just a check!
        synchFolder.QueryInterface(Components.interfaces.nsIMsgFolder);
        //TODO: Listen just to the synch folder. Currently (v2.0.0.17 19-Nov-08) this crashes Thunderbird (no idea why)
        //synchFolder.AddFolderListener(gfn_folderListener, Components.interfaces.nsIFolderListener.added); 
        GriffinMessage.synchFolder = synchFolder;
        var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
        mailSession.AddFolderListener(GriffinMessage.gfn_folderListener, Components.interfaces.nsIFolderListener.intPropertyChanged); 
    },

    scheduleSynch: function(){
        if(GriffinMessage.synchCancel != null){
            if(GriffinMessage.synchCancelTimeout){
                window.clearTimeout(GriffinMessage.synchCancel);
            }
            else{
                window.clearInterval(GriffinMessage.synchCancel);
            }
        }
        // Calculate when the first synch should happen.
        var freq = Number(Griffin.Prefs.getPrefValue("synchContactFrequency", "int"));
        if(freq == 0){
            Griffin.Logger.log("No synch set-up");
            // No schedule.
            return;
        }
        var freqMillis = freq * 60 * 1000;
        var lastSynchTicks = Number(Griffin.Prefs.getPrefValue("lastSynch", "string"));
        var now = new Date();
        var timeTillSynch = lastSynchTicks + freqMillis - now.getTime();
        if(timeTillSynch < 0){
            timeTillSynch = 0;
        }
        Griffin.Logger.log("timeTillSynch: " + timeTillSynch, true, false, true);
        // When the first synch comes around we want to 
        // a) Synch (obviously)
        // b) Schedule the synch to run as often as set in the prefs.
        //
        // a is a straight window.setTimeout thing, the other is a window.setInterval call 
        // that needs to happen at the same time. Hence two lines of dubious code below. We
        // may need to cancel this later (if the frequency changes for example) so save the 
        // results of the setTimeout \ setInterval.
        var timeoutFunc = "GriffinMessage.synchCancel = window.setInterval(\"GriffinMessage.beginSynchContacts();\", " + freqMillis + ");";
        timeoutFunc +=  "GriffinMessage.beginSynchContacts();";
        GriffinMessage.synchCancel = window.setTimeout(timeoutFunc, timeTillSynch);
    },
    
    addressListen: function(){
        var addrbookSession = Components.classes["@mozilla.org/addressbook/services/session;1"].getService().QueryInterface(Components.interfaces.nsIAddrBookSession);
        addrbookSession.addAddressBookListener(GriffinMessage.gfn_addressBookListener, Components.interfaces.nsIAddrBookSession.all);
    },
    
    addressUnListen: function(){
        var addrbookSession = Components.classes["@mozilla.org/addressbook/services/session;1"].getService().QueryInterface(Components.interfaces.nsIAddrBookSession);
        addrbookSession.addAddressBookListener(GriffinMessage.gfn_addressBookListener, Components.interfaces.nsIAddrBookSession.all);
    },

    onLoad: function(){
        GriffinMessage.ensureSalesforceSynchFolder();
        GriffinMessage.addressListen();
        GriffinMessage.scheduleSynch();
    },

    addSelectedMessages: function(){
        var messages = GetSelectedMessages();
        GriffinMessage.addMessages(messages);
    },

    addMessages: function(messages, callback){
        Griffin.Logger.log("Adding " + messages.length + " message(s) to salesforce.", true, true, true);
        if(!GriffinCommon.ensureLogin()){
            return;
        }
        var taskMap = GriffinCommon.getFieldMap("Task");        
        var tasks = [];
        var griffinMessages = [];
        for(var i = 0; i < messages.length; i++){
            var msg = new Griffin.Message(messages[i]);
            var task = new sforce.SObject("Task");            
            for(var currFldIdx = 0; currFldIdx < taskMap.length; currFldIdx++){
                var currFldMap = taskMap[currFldIdx];
                task[currFldMap.sfdcField] = msg.getField(currFldMap.tbirdField);
            }
            griffinMessages.push(msg);
            tasks.push(task);
        }
        GriffinCommon.api.insert(tasks);
        /*
        sforce.connection.create(tasks, {
            onSuccess: function(result){
                Griffin.Logger.log("Successfully added messages!", true, true, true);
                Griffin.Logger.log("Griffin Status", false, true);
                if(callback){
                    callback(griffinMessages);
                }
            },
            onFailure: function(err){
                Griffin.Logger.log("Failed to add messages. Messge was " + err, true, false, true);
            }
        });
        */
    },
    
    openOptions: function(e){
        window.open("chrome://griffin/content/options.xul", "options", "chrome,resizable=yes,titlebar");
    },
    
    // TODO: Globalise synch messages
    getSFDCUpdatedContacts: function(lastUpdateDate, now, retreiveFields, fn_updateMethod){
        // If more than 30 days since last synch, can't use getUpdated. Go for a full blown SOQL query.
        var millisPerMinute = 60 * 1000;
        var millisPerDay = 24 * 60 * millisPerMinute;
        // TODO: Allow synch criteria other than ownership.
        var ownershipLimited = Griffin.Prefs.getPrefValue("synchContactOwnedBy", "string");
        if((now.getTime() - lastUpdateDate.getTime()) > (30 * millisPerDay)){
            // TODO: Globalise
            Griffin.Logger.log("Synchronising contacts (SOQL)...", true, true, false);
            // Use SOQL to get updated records, as too much time has passed to use getUpdated                
            var soql = "SELECT " + retreiveFields + " FROM Contact WHERE LastModifiedDate > " + GriffinCommon.formatDateSfdc(lastUpdateDate);
            var userInfo;
            if(ownershipLimited == "ME"){
                Griffin.Logger.log("Limiting SOQL to just my contacts.", true, false, true);
                // TODO: make getUserInfo query asynch (somehow!);
                userInfo = sforce.connection.getUserInfo();
                soql += " AND OwnerId = '" + userInfo.Id + "'"; 
            }
            if(ownershipLimited == "MYTEAM"){
                // TODO: Really should test this.
                Griffin.Logger.log("Limiting SOQL to just my team.", true, false, true);
                // TODO: make getUserInfo query asynch (somehow!);
                userInfo = sforce.connection.getUserInfo();
                var roleRes = sforce.connection.retrieve("UserRoleId", "User", [userInfo.Id]);
                var teamRoles = [ roleRes.UserRoleId ];
                for(var i = 0; i < teamRoles.length; i++){
                    // TODO: Make roles query asynch (somehow!)
                    var childRoles = sforce.connection.query("Select Id from UserRole Where ParentRoleId = '" + teamRoles[i] + "'");
                    var res = childRoles.getArray("records");
                    for(var j = 0; j < res.length; j++){
                        teamRoles.push(res[i].Id);
                    }
                }
                soql += " AND Owner.UserRoleId IN ( ";
                for(var i = 0; i < teamRoles.length; i++){
                    if(i > 0){
                        soql += ","
                    }
                    soql += "'" + teamRoles[i] + "'";
                }
                soql += ")";
            }
            Griffin.Logger.log("querying salesforce using SOQL: " + soql, true, false, true);
            // TODO: Security. SOQL injection possible?? Would probably only crash out, but worth checking.
            var result = sforce.connection.query(soql, {
                onSuccess: function(result){
                    fn_updateMethod(result.getArray("records"));
                    },
                onFailure: function(err){
                    Griffin.Logger.log(err, true, false, true);
                },
                timeout: 5000
            });
        }
        else if ((now.getTime() - lastUpdateDate.getTime()) < millisPerMinute) {
            Griffin.Logger.log("Less than a minute since last query. (Griffin Ignores you for 10 damage).", true, false, true);
        }
        else{
            // TODO: filter results of getUpdated by Ownership criteria (is there any point in doing it then, esp given it's causing pain elsewhere?)
            Griffin.Logger.log("Synchronising contacts (getUpdated)...", true, true, false);
            sforce.connection.getUpdated("Contact", lastUpdateDate, now, {
                onSuccess: function(result){
                    sforce.connection.retrieve(retreiveFields, "Contact", result.getArray("ids"), {
                        onSuccess: fn_updateMethod,
                        onFailure:  function(err){
                            Griffin.Logger.log(err, true, false, true);
                        },
                        timeout: 5000
                    });
                },
                onFailure: function(err){
                    Griffin.Logger.log(err, true, false, true);
                },
                timeout: 5000
            });
        }
    },
    
    beginSynchContacts: function(){
        var synchContactDir = Griffin.Prefs.getPrefValue("synchContactDir", "string");
        if(synchContactDir == "BOTH" ||
           synchContactDir == "SFDC") {
           
            Griffin.Logger.log("Synchronising contacts...", true, true, false);
            document.getElementById("synch_progress").value = 0;
            
            if(!GriffinCommon.ensureLogin()) {
                return;
            }
            
            var fieldMap = GriffinCommon.getFieldMap("Contact");
            var retreiveFields = "";
            for(var i = 0; i < fieldMap.length; i++){
                if(i > 0)
                    retreiveFields += ",";
                retreiveFields += fieldMap[i].sfdcField;
            }
            
            var prefTime = Griffin.Prefs.getPrefValue("lastSynch", "string");
            if(prefTime == null){
                prefTime = 100;
            }
            var lastUpdateDate = new Date();
            lastUpdateDate.setTime(prefTime);
            var now = new Date();
            GriffinMessage.getSFDCUpdatedContacts(lastUpdateDate, now, retreiveFields, GriffinMessage.updateABFromContacts);            
        }
    },
    
    updateABFromContacts: function(contacts){
        // TODO: Hardcoded directory uri, personal address book, rewite to make dynamic.
        // TODO: Synch across multiple address books.
        Griffin.Logger.log("updateABFromContacts - " + contacts.length + " contacts to synch", true, false, true);
        // Stop listening, or we'll receive try and update a bunch of stuff in SFDC.
        GriffinMessage.addressUnListen();
        var abDirUri = "moz-abmdbdirectory://abook.mab";
        var defaultDirectory = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(abDirUri).QueryInterface(Components.interfaces.nsIAbDirectory);
        var fieldMap = GriffinCommon.getFieldMap("Contact");
        for(var i = 0; i < contacts.length; i++){
            Griffin.Logger.log("Synchronising updates (" + (i + 1) + "/" + contacts.length + ").", true, true, false);
            Griffin.Logger.log("Id: " + contacts[i].Id, true, false, true);
            window.setTimeout("document.getElementById('synch_progress').value = " + ((i + 1) * 100 / contacts.length), 0);
            var currContact = contacts[i];
            
            var matchObj = GriffinCommon.getCardForContact(currContact, fieldMap);
            // Should have found the matchObj by now otherwise we're adding a new card.
            var newCard = (matchObj == null);
            var cardMatch = null;
            if(newCard){
                Griffin.Logger.log("Contact not found - Creating new card.", true, false, true);
                cardMatch = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
            }
            else{
                Griffin.Logger.log("Contact found - Updating card.", true, false, true);
                cardMatch = matchObj.Card;
            }
            GriffinMessage.setProps(cardMatch, fieldMap, currContact);
            if(newCard){
                defaultDirectory.addCard(cardMatch);
            }
            else{
                cardMatch.editCardToDatabase(matchObj.Directory);
            }
        }
        var propogateDeletions = Griffin.Prefs.getPrefValue("synchDeletions", "propogateDeletions");
        if(propogateDeletions){
            //TODO: Should probably synch deletions here :-)
        }
        document.getElementById("synch_progress").value = 100;
        
        GriffinMessage.addressListen();
        // TODO: Fix up the time that we're setting the last synch to. Must set to the time we set in salesforce query, not time update ends.
        var now = new Date();
        Griffin.Prefs.setPrefValue("lastSynch", now.getTime(), "string");
        Griffin.Logger.log("Griffin Status", false, true, false);
    },
    
    setProps: function(card, fieldMap, contact){
        for(var i = 0; i < fieldMap.length; i++){
            var tbirdFld = fieldMap[i].tbirdField;
            var sfdcFld = fieldMap[i].sfdcField;
            card[tbirdFld] = contact[sfdcFld];
        }
    },

    // Taken from extensions.js loaded when the add on manager comes up.
    openURL: function (aURL) {
        var uri = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(aURL, null, null);
        var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
        protocolSvc.loadUrl(uri);
    }

};

window.addEventListener("load", GriffinMessage.onLoad, false);