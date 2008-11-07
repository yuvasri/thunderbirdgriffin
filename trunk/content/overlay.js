var GriffinMessage = { 
    synchCancelTimeout: false,
    synchCancel: null,

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
        var freq = GriffinCommon.getPrefValue("synchContactFrequency", "int");
        if(freq == 0){
            // No schedule.
            return;
        }
        var freqMillis = freq * 60 * 1000;
        var lastSynchTicks = GriffinCommon.getPrefValue("lastSynch", "string");
        var now = new Date();
        var timeTillSynch = lastSynchTicks + freqMillis - now.getTime();
        if(timeTillSynch < 0){
            timeTillSynch = 0;
        }
        // When the first synch comes around we want to 
        // a) Synch (obviously)
        // b) Schedule the synch to run as often as set in the prefs.
        //
        // a is a straight window.setTimeout thing, the other is a window.setInterval call 
        // that needs to happen at the same time. Hence two lines of dubious code below. We
        // may need to cancel this later (if the frequency changes for example) so save the 
        // results of the setTimeout \ setInterval.
        var timeoutFunc = "GriffinMessage.synchCancel = window.setInterval(\"GriffinMessage.synchContacts();\", " + freqMillis + ");";
        timeoutFunc +=  "GriffinMessage.synchContacts();";
        GriffinMessage.synchCancel = window.setTimeout(timeoutFunc, timeTillSynch);
    },

    onLoad: function(){
        GriffinMessage.scheduleSynch();
    },
  
    addSelectedMessages: function(){
        var messages = GetSelectedMessages();
        GriffinMessage.addMessages(messages);
    },    
  
    addMessages: function(messages){
        if(!GriffinCommon.ensureLogin()){
            return;
        }        
        var taskMap = GriffinCommon.getFieldMap("Task");        
        var tasks = [];
        for(var i = 0; i < messages.length; i++){
            var msg = new Griffin.Message(messages[i]);
            var task = new sforce.SObject('Task');            
            for(var currFldIdx = 0; currFldIdx < taskMap.length; currFldIdx++){
                var currFldMap = taskMap[currFldIdx];
                task[currFldMap.sfdcField] = msg.getField(currFldMap.tBirdField);;
            }
            tasks.push(task);
        }
        sforce.connection.create(tasks);
    },
    
    openOptions: function(e){
        window.open('chrome://griffin/content/options.xul', 'options', "chrome,resizable=yes,titlebar");
    },
    
    // TODO: Undirty-ify the padLeft function.
    padLeft: function(inString, padChar, targetLen){
        while(inString.length < targetLen){
            inString = padChar + inString;
        }
        return inString;
    },
    
    formatDateSfdc: function(inDate){
        var year = GriffinMessage.padLeft(inDate.getUTCFullYear().toString(), "0", 4);
        // Gotcha! getMonth runs from 0-11, so add one to result!
        var month = GriffinMessage.padLeft((inDate.getUTCMonth() + 1).toString(), "0", 2); 
        var day = GriffinMessage.padLeft(inDate.getUTCDate().toString(), "0", 2);
        var hour = GriffinMessage.padLeft(inDate.getUTCHours().toString(), "0", 2);
        var minute = GriffinMessage.padLeft(inDate.getUTCMinutes().toString(), "0", 2);
        var second = GriffinMessage.padLeft(inDate.getUTCSeconds().toString(), "0", 2);
        return year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + "Z";
    },
    
    getSFDCUpdatedContacts: function(lastUpdateDate, now, retreiveFields){
        // If more than 30 days since last synch, can't use getUpdated. Go for a full blown SOQL query.
        var millisPerDay = 24 * 60 * 60 * 1000;
        var contacts = null;
        // TODO: Allow synch criteria other than ownership.
        var ownershipLimited = GriffinCommon.getPrefValue("synchContactOwnedBy", "string");
        if((now.getTime() - lastUpdateDate.getTime()) > (30 * millisPerDay)){
            document.getElementById("gfn_status").setAttribute("label", "Synchronising contacts (SOQL)...");
            // Use SOQL to get updated records, as too much time has passed to use getUpdated                
            var soql = "SELECT " + retreiveFields + " FROM Contact WHERE LastModifiedDate > " + GriffinMessage.formatDateSfdc(lastUpdateDate);
            if(ownershipLimited == "ME"){
                var userInfo = sforce.connection.getUserInfo();
                soql += " AND OwnerId = '" + userInfo.Id + "'"; 
            }
            if(ownershipLimited == "MYTEAM"){
                var userInfo = sforce.connection.getUserInfo();
                var roleRes = sforce.connection.retrieve("UserRoleId", "User", [userInfo.Id]);
                var teamRoles = [ roleRes.UserRoleId ];
                for(var i = 0; i < teamRoles.length; i++){
                    var childRoles = sforce.connection.query("Select Id from UserRole Where ParentRoleId = '" + teamRoles[i] + "'");
                    var res = childRoles.getArray('records');
                    for(var i = 0; i < res.length; i++){
                        teamRoles.push(res[i].Id);
                    }
                }
                soql += " AND Owner.UserRoleId IN ( ";
                for(var i = 0; i < teamRoles.length; i++){
                    if(i > 0){
                        soql += ','
                    }
                    soql += "'" + teamRoles[i] + "'"
                }
                soql += ")";
            }
            // TODO: Security. SOQL injection possible?? Would probably only crash out, but worth checking.
            var result = sforce.connection.query(soql);
                
            contacts = result.getArray("records");
        }
        else{
            // TODO: filter results of getUpdated by Ownership criteria.
            document.getElementById("gfn_status").setAttribute("label", "Synchronising contacts (getUpdated)...");
            result = sforce.connection.getUpdated("Contact", lastUpdateDate, now);
            contacts = sforce.connection.retrieve(retreiveFields, "Contact", result.getArray("ids"));
        }
        return contacts;
    },
    
    synchContacts: function(){
        var synchContactDir = GriffinCommon.getPrefValue("synchContactDir", "string");
        if(synchContactDir == 'BOTH' ||
           synchContactDir == 'SFDC') {
           
            var statusPanel = document.getElementById("gfn_status");
            statusPanel.setAttribute("label", "Synchronising contacts...");
            progressbar.value = 0;
            
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
            
            var prefTime = GriffinCommon.getPrefValue("lastSynch", "string");
            if(prefTime == null){
                prefTime = 1000;
            }
            var lastUpdateDate = new Date();
            lastUpdateDate.setTime(prefTime);
            var now = new Date();
            var contacts = GriffinMessage.getSFDCUpdatedContacts(lastUpdateDate, now, retreiveFields);            
            
            // TODO: Hardcoded directory uri, personal address book, rewite to make dynamic.
            // TODO: Synch across multiple address books.
            var abDirUri = "moz-abmdbdirectory://abook.mab";
            var defaultDirectory = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(abDirUri).QueryInterface(Components.interfaces.nsIAbDirectory);
            for(var i = 0; i < contacts.length; i++){
                GriffinCommon.log("Synchronising updates (" + i + "/" + contacts.length + ")", false, true, false);
                window.setTimeout("document.getElementById('synch_progress').value = " + (i * 100 / contacts.length), 0);
                var currContact = contacts[i];
                
                var matchObj = GriffinCommon.getCardForContact(currContact, [{tbirdField: "Custom1", sfdcField: "Id", strength: 100}]);
                var newCard = (matchObj == null);
                var cardMatch = null;
                if(newCard){
                    cardMatch = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
                }
                else{
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
            progressbar.value = 100;
            GriffinCommon.setPrefValue("lastSynch", now.getTime(), "string");
            GriffinCommon.log("Griffin Status", false, true, false);
        }
    },
    
    setProps: function(card, fieldMap, contact){
        for(var i = 0; i < fieldMap.length; i++){
            var tbirdFld = fieldMap[i].tBirdField;
            var sfdcFld = fieldMap[i].sfdcField;
            card[tbirdFld] = contact[sfdcFld];
        }
    },
    
    /*
    getCardForContact: function(contact){
        var id = contact.Id;
        var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
        // enumerate all of the address books on this system
        var parentDir = rdfService.GetResource("moz-abdirectory://").QueryInterface(Components.interfaces.nsIAbDirectory);
        var enumerator = parentDir.childNodes;
        while (enumerator.hasMoreElements()) {
            var addrbook = enumerator.getNext();  // an addressbook directory
            addrbook.QueryInterface(Components.interfaces.nsIAbDirectory);
            var searchUri= addrbook.directoryProperties.URI + "?(or(Custom1,c," + id + "))";  // search for the contact in this book
            var directory = rdfService.GetResource(searchUri).QueryInterface(Components.interfaces.nsIAbDirectory);
            var currentItem = null;
            try {
                var ChildCards = directory.childCards;
                ChildCards.first();
                currentItem = ChildCards.currentItem();
            } catch(e) {
                var ChildCards = directory.childNodes;
                if (ChildCards.hasMoreElements()){
                    currentItem = ChildCards.getNext();   
                }
            }
            if(currentItem != null){
                var card = currentItem.QueryInterface(Components.interfaces.nsIAbCard);
                return {Card: card, Directory: addrbook.directoryProperties.URI};
            }
        }
        // Not found in any address book. Return null;
        return null;
    },*/
    
    getFolderByName: function(fldName){
        return null;
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);