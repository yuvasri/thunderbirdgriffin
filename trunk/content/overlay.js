var GriffinMessage = {  
    onLoad: function(){
    },
    
    ensureLogin: function(){        
        if(sforce.connection.sessionId == null){
            var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
                                
             // the host name of the password we are looking for
            var queryString = sforce.connection.serverUrl;
            // ask the password manager for an enumerator:
            var e = passwordManager.enumerator;
            // step through each password in the password manager until we find the one we want:
            while (e.hasMoreElements()) {
                try {
                    // get an nsIPassword object out of the password manager.
                    // This contains the actual password...
                    var pass = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
                    if (pass.host == queryString) {
                         // found it! (Hopefully!!)
                         try{
                            var loginResult = sforce.connection.login(pass.user, pass.password);
                            sforce.connection.serverUrl = loginResult.serverUrl;
                         } catch (e) {
                            GriffinCommon.log('Stored login for ' + queryString + ' failed with error ' + e);
                         }
                         break;
                    }
                } catch (ex) {
                    continue;
                }
            }  
            if(sforce.connection.sessionId == null){                
                var dialog = window.openDialog('chrome://griffin/content/login.xul', '_blank', 'modal');
            }
        }
        return sforce.connection.sessionId != null;
    },
  
    addMessageToSalesforce: function(e){
        if(!GriffinMessage.ensureLogin()){
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
    
    getContactFieldMap: function(){    
        var connection = GriffinCommon.getDbConnection();
        var statement = connection.createStatement("SELECT tBirdField, sfdcField FROM FieldMap WHERE object = 'Contact'");
        var fieldMap = [];
        try{
            while(statement.executeStep()){
                var s_tBirdField = statement.getUTF8String(0);
                var s_sfdcField = statement.getUTF8String(1);
                fieldMap.push( { tBirdField: s_tBirdField, sfdcField: s_sfdcField });
            }
            return fieldMap;
        }
        finally{
            statement.reset();
        }
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
        if(!GriffinMessage.ensureLogin()) {
            return;
        }
        var synchContactDir = GriffinCommon.getOptionVal("SynchContactDir");
        if(synchContactDir == 'SYNCHBOTH' ||
           synchContactDir == 'SYNCHFROMSFDC' ||
           synchContactDir == 'UPDATEFROMSFDC') {
            var fieldMap = GriffinMessage.getContactFieldMap();
            var retreiveFields = "";
            for(var i = 0; i < fieldMap.length; i++){
                if(i > 0)
                    retreiveFields += ",";
                retreiveFields += fieldMap[i].sfdcField;
            }
            var now = new Date();
            var lastUpdateDate = new Date();
            lastUpdateDate.setTime(GriffinCommon.getOptionVal("LastSynch"));
            // If more than 30 days since last synch, can't use getUpdated. Go for a full blown SOQL query.
            var millisPerDay = 24 * 60 * 60 * 1000;
            var contacts = null;
            if((now.getTime() - lastUpdateDate.getTime()) > (30 * millisPerDay)){
                // TODO: Security. Limited SOQL injection possible?? Would only crash out probably.
                var result = sforce.connection.query("SELECT " + retreiveFields + " FROM Contact WHERE LastModifiedDate > " + GriffinMessage.formatDateSfdc(lastUpdateDate));
                contacts = result.getArray("records");
            }
            else{
                result = sforce.connection.getUpdated("Contact", formatDateSfdc(GriffinMessage.lastUpdateDate), now);
                records = result.getArray("ids");
                contacts = [];
                for(var i = 0; i < records.length; i++){
                    contacts.push(sforce.connection.retrieve(retreiveFields, "Contact", records[i]));
                }
            }     
            // TODO: Hardcoded directory uri, personal address book, rewite to make dynamic.
            // TODO: Synch across multiple address books.
            var abDirUri = "moz-abmdbdirectory://abook.mab";
            var directory = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(abDirUri).QueryInterface(Components.interfaces.nsIAbDirectory);
            for(var i = 0; i < contacts.length; i++){
                var currContact = contacts[i];
                var cardMatch = GriffinMessage.getCardForContact(currContact, abDirUri);
                if(cardMatch == null){
                    GriffinMessage.addCard(currContact, directory, fieldMap);
                }
                else{
                    GriffinMessage.updateCard(currContact, cardMatch, fieldMap);
                }
            }
            // TODO: Update LastSynch.
        }
    },
    
    addCard: function(contact, directory, fieldMap){
        var newCard = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
        for(var i = 0; i < fieldMap.length; i++){
            newCard.setCardValue(fieldMap[i].tBirdField, fieldMap[i].sfdcField);
        }
        directory.addCard(newCard);
    },
    
    updateCard: function(contact, card, fieldMap){
        for(var i = 0; i < fieldMap.length; i++){
            card.setCardValue(fieldMap[i].tBirdField, fieldMap[i].sfdcField);
        }
        directory.modifyCard(card);
    },
    
    getCardForContact: function(contact, currentAbURI){
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
                return currentItem.QueryInterface(Components.interfaces.nsIAbCard);
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