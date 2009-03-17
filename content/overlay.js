/**
Description
This file holds the code that overlays the main thunderbird window.

*/


var GriffinMessage = { 

    //Properties
    synchCancelTimeout: false,
    synchCancel: null,
    synchFolder: null,
    updateABFromContactsData: null, 
    
    /**
    Event handler for the window.onload event. It:
        Listens for new address book entries
        Listens for messages being dropped into the synch folder.
        Schedules a periodic contact synchronisation.
    */
    onLoad: function(){
        GriffinMessage.ensureSalesforceSynchFolder();
        GriffinMessage.addressListen();
        GriffinMessage.scheduleSynch();
        GriffinCommon.ensureDatabase();
        Griffin.Logger.log("Griffin Status", false, true);
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
            // TODO: Can we do better than swallowing the exception from localFoldersRoot.createSubfolder to check if the synch folder is already created?
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
        addrbookSession.removeAddressBookListener(GriffinMessage.gfn_addressBookListener);
    },

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
    
    // http://www.xulplanet.com/references/xpcomref/ifaces/nsIAbListener.html
    gfn_addressBookListener: {
    
        timeout: null,
        cardsToSave: [],
    
        saveCardsToCRM: function(){
           GriffinMessage.gfn_addressBookListener.timeout = null;
           GriffinCommon.ensureLogin(
                function(){
                    var synchContactDir = Griffin.Prefs.getPrefValue("synchContactDir", "string");
                    var cards = GriffinMessage.gfn_addressBookListener.cardsToSave;
                    if(synchContactDir == "BOTH" ||
                        synchContactDir == "TBIRD") {
                        Griffin.Logger.log("Updating " + cards.length + " contacts in CRM.", true, true);
                        var myObj = GriffinCommon.getCrmObjectFromTbirdObject("Contact");
                        var fieldMap = GriffinCommon.getFieldMap("Contact");
                        for(var i = 0; i < cards.length; i++){
                            var contact = new Griffin.Contact(cards[i].card);
                            var crmContact = GriffinMessage.gfn_addressBookListener.setContactVals(contact, fieldMap);
                            var id = GriffinCommon.api.upsert(myObj, crmContact);
                            if(id != null){
                                Griffin.Logger.log("Sucessfully added contact to CRM.", true);
                                GriffinMessage.addressUnListen();
                                // TODO: fix up the id mapping on card creation.
                                cards[i].card.custom1 = id;
                                cards[i].card.editCardToDatabase(cards[i].folder);
                                GriffinMessage.addressListen();
                            }
                            else
                            {
                                Griffin.Logger.log("Sucessfully updated contact in CRM.", true);
                            }
                        }
                    }
                    Griffin.Logger.log("Griffin Status", false, true);
                    // Clear the array of cards to save.
                    cards.length = 0;
                }
            );
        },
    
        setContactVals: function(card, fieldMap){
            var contact = {};
            for(var i = 0; i < fieldMap.length; i++){
                var currMapping = fieldMap[i];
                contact[currMapping.crmField] = card.getField(currMapping.tbirdField);
            }
            return contact;
        },
    
        beginSaveCard: function(card){
            try{
                card.QueryInterface(Components.interfaces.nsIAbCard);
            }
            catch(e){
                // Not interested if it's not a card.
                return;
            }
            GriffinMessage.gfn_addressBookListener.cardsToSave.push(card);
            var timeout = Griffin.Prefs.getPrefValue("messageBatchingTimeout", "int");
            if(GriffinMessage.gfn_addressBookListener.timeout != null){
                window.clearTimeout(GriffinMessage.gfn_addressBookListener.timeout);
            }
            GriffinMessage.gfn_addressBookListener.timeout = window.setTimeout("GriffinMessage.gfn_addressBookListener.saveCardsToCRM();", timeout);

        },      
    
        onItemAdded: function(parentDir, item ){
            Griffin.Logger.log("function: onItemAdded\nparentDir: " + parentDir + "\nitem: " + item, true);
            try{
                parentDir.QueryInterface(Components.interfaces.nsIAbDirectory);
            }
            catch (e) {
                // Folder isn't a folder... do nothing?
                Griffin.Logger.log(e, true);
                return;
            }
            var synchAddrBook = Griffin.Prefs.getPrefValue("synchAddrBook", "string");
            if(synchAddrBook == "ALL" || parentDir.directoryProperties.URI == synchAddrBook){
                GriffinMessage.gfn_addressBookListener.beginSaveCard(item, parentDir);
            }
        },
        
        // TODO: only save if a synch property changes, not just any property?
        onItemPropertyChanged: function(item, property, oldValue, newValue ){
            Griffin.Logger.log("function: onItemPropertyChanged\nitem: " + item + "\nproperty: " + property + "\noldValue: " + oldValue + "\nnewValue: " + newValue, true);
            GriffinMessage.gfn_addressBookListener.beginSaveCard(item);
        },
        
        onItemRemoved: function(parentDir, item ){
            //Griffin.Logger.log("function: onItemRemoved\nparentDir: " + parentDir + "\nitem: " + item, true);
            //TODO: Need to synch deletions between salesforce and thunderbird.
        }
    },

    addSelectedMessages: function(){
        var messages = GetSelectedMessages();
        GriffinMessage.addMessages(messages);
    },

    addMessages: function(messages, callback){
        Griffin.Logger.log("Adding " + messages.length + " message(s) to salesforce.", true, true, true);
        GriffinCommon.ensureLogin(
            function(){            
                var taskMap = GriffinCommon.getFieldMap("Task");
                var tasks = [];
                var griffinMessages = [];
                for(var i = 0; i < messages.length; i++){
                    var msg = new Griffin.Message(messages[i]);
                    var task = {}; 
                    for(var currFldIdx = 0; currFldIdx < taskMap.length; currFldIdx++){
                        var currFldMap = taskMap[currFldIdx];
                        task[currFldMap.crmField] = msg.getField(currFldMap.tbirdField);
                    }
                    griffinMessages.push(msg);
                    tasks.push(task);
                }
                var myObj = GriffinCommon.getCrmObjectFromTbirdObject("Task");
                GriffinCommon.api.insert(myObj, tasks, function(success){
                    if(success && callback){
                        callback(griffinMessages);
                    }
                });
            }
        );
    },
    
    openOptions: function(e){
        window.open("chrome://griffin/content/options.xul", "options", "chrome,resizable=yes,titlebar");
    },
    
    beginSynchContacts: function(){
        var synchContactDir = Griffin.Prefs.getPrefValue("synchContactDir", "string");
        if(synchContactDir == "BOTH" ||
           synchContactDir == "SFDC") {
           
            Griffin.Logger.log("Synchronising contacts...", true, true, false);
            document.getElementById("synch_progress").value = 0;
            
            GriffinCommon.ensureLogin(
                function(){
                    var fieldMap = GriffinCommon.getFieldMap("Contact");
                    var retreiveFields = "";
                    for(var i = 0; i < fieldMap.length; i++){
                        if(i > 0)
                            retreiveFields += ",";
                        retreiveFields += fieldMap[i].crmField;
                    }
                    
                    var prefTime = Griffin.Prefs.getPrefValue("lastSynch", "string");
                    if(prefTime == null){
                        prefTime = 100;
                    }
                    var lastUpdateDate = new Date();
                    lastUpdateDate.setTime(prefTime);
                    GriffinMessage.getCRMUpdatedContacts(lastUpdateDate, retreiveFields);
                }
            );
        }
    },
    
    // TODO: Globalise synch messages
    getCRMUpdatedContacts: function(lastUpdateDate, retreiveFields){
        // TODO: Allow synch criteria other than ownership.
        var ownershipLimited = Griffin.Prefs.getPrefValue("synchContactOwnedBy", "string");
        var crmObj = GriffinCommon.getCrmObjectFromTbirdObject("Contact");
        var contacts = GriffinCommon.api.getRecords(crmObj, lastUpdateDate, ownershipLimited, retreiveFields, GriffinMessage.getUpdatedContactsComplete);
    },
    
    getUpdatedContactsComplete: function(contacts){   
        Griffin.Logger.log("updateABFromContacts - " + contacts.length + " contacts to synch", true, false, true);
        var candidates = GriffinCommon.getCandidateMatches();
        GriffinMessage.updateABFromContactsData = {lastIdx: 0, contacts: contacts, candidates: candidates};
        var delay = Griffin.Prefs.getPrefValue("ContactBatchDelay", "int");
        window.setTimeout("GriffinMessage.updateABFromContacts()", delay);
    },
       
    updateABFromContacts: function(){
        var contactsThisRun = Griffin.Prefs.getPrefValue("ContactBatchSize", "int");
        var lastIdx = GriffinMessage.updateABFromContactsData.lastIdx;
        var contacts = GriffinMessage.updateABFromContactsData.contacts;
        var candidates = GriffinMessage.updateABFromContactsData.candidates;
        var abDirUri = Griffin.Prefs.getPrefValue("synchAddrBook", "string");
        if(abDirUri == 'ALL'){
            abDirUri = "moz-abmdbdirectory://abook.mab";
        }
        var defaultDirectory = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(abDirUri).QueryInterface(Components.interfaces.nsIAbDirectory);
        var fieldMap = GriffinCommon.getFieldMap("Contact");
        if(contactsThisRun + lastIdx > contacts.length){
            contactsThisRun = contacts.length - lastIdx;
        }
        // Stop listening, or we'll receive try and update a bunch of stuff in CRM.
        GriffinMessage.addressUnListen();
        var i = lastIdx;
        for(; i < contactsThisRun + lastIdx; i++){
            var currContact = contacts[i];            
            var matchObj = GriffinCommon.getBestMatch(fieldMap, candidates, currContact);
            // Should have found the matchObj by now, otherwise we're adding a new card.
            var newCard = (matchObj == null);
            var cardMatch = null;
            if(newCard){
                Griffin.Logger.log("Contact not found - Creating new card for id " + currContact.Id + ".", true, false, true);
                cardMatch = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
            }
            else{
                Griffin.Logger.log("Contact found - Updating card for id " + currContact.Id + ".", true, false, true);
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
        Griffin.Logger.log("Synchronising updates (" + (i + 1) + "/" + contacts.length + ").", true, true, false);
        document.getElementById('synch_progress').value = ((i + 1) * 100 / contacts.length);
        GriffinMessage.addressListen();
        if(i == contacts.length){
            var propogateDeletions = Griffin.Prefs.getPrefValue("synchDeletions", "propogateDeletions");
            if(propogateDeletions){
                //TODO: Should probably synch deletions here :-)
            }
            document.getElementById("synch_progress").value = 100;
            
            // TODO: Fix up the time that we're setting the last synch to. Should set to the time we set in salesforce query, not time update ends.
            var now = new Date();
            Griffin.Prefs.setPrefValue("lastSynch", now.getTime(), "string");
            Griffin.Logger.log("Griffin Status", false, true, false);
        }
        else{
            GriffinMessage.updateABFromContactsData.lastIdx = i;
            var delay = Griffin.Prefs.getPrefValue("ContactBatchDelay", "int");
            window.setTimeout("GriffinMessage.updateABFromContacts()", delay);
        }
    },
    
    setProps: function(cardMatch, fieldMap, currContact){
        for(var i = 0; i < fieldMap.length; i++){
            var currMap = fieldMap[i];
            cardMatch[currMap.tbirdField] = currContact[currMap.crmField];
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