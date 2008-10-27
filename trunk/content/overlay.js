var GriffinMessage = {  
    onLoad: function(){
    },
  
    addMessageToSalesforce: function(e){
        if(!GriffinCommon.ensureLogin()){
            return;
        }
        // TODO: Use configured task mapping instead of hardcoding.
        var messages = GetSelectedMessages();
        var tasks = [];
        for(var i = 0; i < messages.length; i++){
            var messageURI = messages[i];
            var hdr = messenger.msgHdrFromURI(messageURI);
            var task = new sforce.SObject('Task');
            task.Description = getContentFromMessageURI(messageURI);
            task.Subject = hdr.subject;
            tasks.push(task);
        }
        sforce.connection.create(tasks);
    },
    
    getContentFromMessageURI: function(uri){   
        var content = "";
        var MsgService = messenger.messageServiceFromURI(uri);
        var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
        var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
        var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
        var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
        ScriptInputStream.init(consumer);
        try {
          MsgService.streamMessage(uri, MsgStream, msgWindow, null, false, null);
        } catch (ex) {
          GriffinCommon.log("error while getting message content: " + ex)
        }
        ScriptInputStream.available();
        while (ScriptInputStream .available()) {
          content = content + ScriptInputStream.read(512);
        }
        return content;
    },
    
    openOptions: function(e){
        window.open('chrome://griffin/content/options.xul', '_blank', 'chrome,extrachrome');
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
    
    synchContacts: function(){
        if(!GriffinCommon.ensureLogin()) {
            return;
        }
        var synchContactDir = GriffinCommon.getPrefValue("synchContactDir", "string");
        if(synchContactDir == 'BOTH' ||
           synchContactDir == 'SFDC') {
            var fieldMap = GriffinCommon.getContactFieldMap();
            var retreiveFields = "";
            for(var i = 0; i < fieldMap.length; i++){
                if(i > 0)
                    retreiveFields += ",";
                retreiveFields += fieldMap[i].sfdcField;
            }
            var now = new Date();
            var lastUpdateDate = new Date();
            var prefTime = GriffinCommon.getPrefValue("lastSynch", "string");
            if(prefTime == null){
                prefTime = 1000;
            }
            lastUpdateDate.setTime(prefTime);
            // If more than 30 days since last synch, can't use getUpdated. Go for a full blown SOQL query.
            var millisPerDay = 24 * 60 * 60 * 1000;
            var contacts = null;
            var ownershipLimited = GriffinCommon.getPrefValue("synchContactOwnedBy", "string");
            if((now.getTime() - lastUpdateDate.getTime()) > (30 * millisPerDay)){
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
                result = sforce.connection.getUpdated("Contact", lastUpdateDate, now);
                contacts = sforce.connection.retrieve(retreiveFields, "Contact", result.getArray("ids"));
            }     
            // TODO: Hardcoded directory uri, personal address book, rewite to make dynamic.
            // TODO: Synch across multiple address books.
            var abDirUri = "moz-abmdbdirectory://abook.mab";
            var defaultDirectory = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(abDirUri).QueryInterface(Components.interfaces.nsIAbDirectory);
            for(var i = 0; i < contacts.length; i++){
                var currContact = contacts[i];
                var matchObj = GriffinMessage.getCardForContact(currContact);
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
            GriffinCommon.setPrefValue("lastSynch", now.getTime(), "string");
        }
    },
    
    setProps: function(card, fieldMap, contact){
        for(var i = 0; i < fieldMap.length; i++){
            var tbirdFld = fieldMap[i].tBirdField;
            var sfdcFld = fieldMap[i].sfdcField;
            card[tbirdFld] = contact[sfdcFld];
        }
    },
    
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
    },
    
    getFolderByName: function(fldName){
        return null;
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);