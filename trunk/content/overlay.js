var GriffinMessage = {  
    onLoad: function(){
    },
    
    ensureLogin: function(){        
        if(sforce.connection.sessionId == null){
            var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);
                                
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
                         // found it!
                         alert(pass.user); // the username
                         alert(pass.password); // the password
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
        // TODO: Find out where GetSelectedMessages is defined??
        var messages = GetSelectedMessages();

        var tasks = [];
        for(var i = 0; i < messages.length; i++){
            var content = "";            
            var MsgService = messenger.messageServiceFromURI(MessageURI);
            var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
            var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
            var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
            var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
            ScriptInputStream.init(consumer);
            try {
              MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null);
            } catch (ex) {
              alert("error: "+ex)
            }
            ScriptInputStream .available();
            while (ScriptInputStream .available()) {
              content = content + ScriptInputStream .read(512);
            }
            var task = new sforce.SObject('Task');
            var hdr = messenger.msgHdrFromURI(messages[i]);
            task.Description = content;
            task.Subject = hdr.subject;
            tasks.push(task);
        }
        sforce.connection.create(tasks);

    },
    
    openOptions: function(e){
        window.open('chrome://griffin/content/options.xul', '_blank', 'chrome,extrachrome');
    },
    
    synchContacts: function(){
        if(!GriffinMessage.ensureLogin()){
            return;
        }
        var synchContactDir = GriffinCommon.getOptionVal("SynchContactDir"); 
        if(synchContactDir == 'SYNCHBOTH' ||
           synchContactDir == 'SYNCHFROMSFDC' ||
           synchContactDir == 'UPDATEFROMSFDC')
        {
            var searchSession = Components.classes[searchSessionContractID].createInstance(Components.interfaces.nsIMsgSearchSession);
            var lastUpdate = GriffinCommon.getOptionVal("LastSynch");
            GriffinCommon.log(lastUpdate);
            var now = new Date();
            var result = sforce.connection.getUpdated("Contact", lastUpdate, now);
            var records = result.getArray("ids");
            var connection = GriffinCommon.getDbConnection();
            var statement = connection.createStatement("SELECT tBirdField, sfdcField FROM FieldMap WHERE object = 'Contact'");
            var retrieveFields = "";
            var fieldMap = {};
            try{
                while(statement.executeStep()){
                    if(retrieveFields.length > 0){
                        retrieveFields += ",";
                    }
                    var tBirdField = statement.getUTF8String(0);
                    var sfdcField = statement.getUTF8String(1);
                    retrieveFields += sfdcField;
                    fieldMap[sfdcField] = tBirdField;
                }
            }
            finally{
                statement.reset();
            }
            for(var i = 0; i < records.length; i++){
                var currContact = sforce.connection.retrieve(retrieveFields, "Contact", records[i]);
                var searchTerm = searchSession.createTerm();
                var value = searchTerm.value;
                value.str = aValue;
                searchTerm.value = value;

                searchTerm.op = searchSession.BooleanOR;
                searchTerm.booleanAnd = false;

                searchSession.appendTerm(searchTerm);
                searchSession.search(null);
            }
        }
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);