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
        var freq = Number(GriffinCommon.getPrefValue("synchContactFrequency", "int"));
        if(freq == 0){
            GriffinCommon.log("No synch set-up");
            // No schedule.
            return;
        }
        var freqMillis = freq * 60 * 1000;
        var lastSynchTicks = Number(GriffinCommon.getPrefValue("lastSynch", "string"));
        var now = new Date();
        var timeTillSynch = lastSynchTicks + freqMillis - now.getTime();
        if(timeTillSynch < 0){
            timeTillSynch = 0;
        }
        GriffinCommon.log("timeTillSynch: " + timeTillSynch, true, false, true);
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
    
    gfn_folderListener: {
        // Add \ Remove \ Event
        OnItemAdded: function ( 
        /*nsIRDFResource*/ parentItem , 
        /*nsISupports*/ item ){
            GriffinCommon.log("OnItemAdded parentItem: " + parentItem + " item: " + item);
        },
        OnItemRemoved: function ( 
        /*nsIRDFResource*/ parentItem , 
        /*nsISupports*/ item ){
            GriffinCommon.log("OnItemAdded parentItem: " + parentItem + " item: " + item);
        },        
        OnItemEvent: function ( 
        /*nsIMsgFolder*/ item , 
        /*nsIAtom*/ event ){
            GriffinCommon.log("OnItemAdded item: " + item + " event: " + event);
        },
        
        // Property change
        OnItemBoolPropertyChanged: function ( 
        /*nsIRDFResource*/ item , 
        /*nsIAtom*/ property , 
        /*PRBool*/ oldValue , 
        /*PRBool*/ newValue ){
            GriffinCommon.log("OnItemBoolPropertyChanged item: " + item + " property: " + property + " oldValue: " + oldValue + " newValue: " + newValue);
        }, 
        OnItemIntPropertyChanged: function ( 
        /*nsIRDFResource*/ item , 
        /*nsIAtom*/ property ,
        /*PRInt32*/ oldValue , 
        /*PRInt32*/ newValue ){
            GriffinCommon.log("OnItemIntPropertyChanged item: " + item + " property: " + property + " oldValue: " + oldValue + " newValue: " + newValue);
        },
        OnItemPropertyChanged: function ( 
        /*nsIRDFResource*/ item , 
        /*nsIAtom*/ property , 
        /*char**/ oldValue , 
        /*char**/ newValue ){
            GriffinCommon.log("OnItemPropertyChanged item: " + item + " property: " + property + " oldValue: " + oldValue + " newValue: " + newValue);
        },
        OnItemPropertyFlagChanged: function ( 
        /*nsIMsgDBHdr*/ item , 
        /*nsIAtom*/ property , 
        /*PRUint32*/ oldFlag , 
        /*PRUint32*/ newFlag ){
            GriffinCommon.log("OnItemPropertyFlagChanged item: " + item + " property: " + property + " oldFlag: " + oldFlag + " newFlag: " + newFlag);
        },  
        OnItemUnicharPropertyChanged: function ( 
        /*nsIRDFResource*/ item , 
        /*nsIAtom*/ property , 
        /*PRUnichar**/ oldValue , 
        /*PRUnichar**/ newValue ){
            GriffinCommon.log("OnItemUnicharPropertyChanged item: " + item + " property: " + property + " oldValue: " + oldValue + " newValue: " + newValue);
        },

        QueryInterface : function(iid)
        {
          if (iid.equals(Components.interfaces.nsIFolderListener) )
            return this;
         
          throw Components.results.NS_NOINTERFACE;
        }
    },

    onLoad: function(){
        GriffinMessage.scheduleSynch();
        var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
        mailSession.AddFolderListener(GriffinMessage.gfn_folderListener, Components.interfaces.nsIFolderListener.all); 
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
            var task = new sforce.SObject("Task");            
            for(var currFldIdx = 0; currFldIdx < taskMap.length; currFldIdx++){
                var currFldMap = taskMap[currFldIdx];
                task[currFldMap.sfdcField] = msg.getField(currFldMap.tbirdField);
            }
            tasks.push(task);
        }
        sforce.connection.create(tasks);
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
        var ownershipLimited = GriffinCommon.getPrefValue("synchContactOwnedBy", "string");
        
        if((now.getTime() - lastUpdateDate.getTime()) > (30 * millisPerDay)){
            // TODO: Globalise
            GriffinCommon.log("Synchronising contacts (SOQL)...", true, true, false);
            // Use SOQL to get updated records, as too much time has passed to use getUpdated                
            var soql = "SELECT " + retreiveFields + " FROM Contact WHERE LastModifiedDate > " + GriffinCommon.formatDateSfdc(lastUpdateDate);
            var userInfo;
            if(ownershipLimited == "ME"){
                GriffinCommon.log("Limiting SOQL to just my contacts.", true, false, true);
                // TODO: make getUserInfo query asynch (somehow!);
                userInfo = sforce.connection.getUserInfo();
                soql += " AND OwnerId = '" + userInfo.Id + "'"; 
            }
            if(ownershipLimited == "MYTEAM"){
                // TODO: Really should test this.
                GriffinCommon.log("Limiting SOQL to just my team.", true, false, true);
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
            GriffinCommon.log("querying salesforce using SOQL: " + soql, true, false, true);
            // TODO: Security. SOQL injection possible?? Would probably only crash out, but worth checking.
            var result = sforce.connection.query(soql, {
                onSuccess: function(result){
                    fn_updateMethod(result.getArray("records"));
                    },
                onFailure: function(err){
                    GriffinCommon.log(err, true, false, true);
                },
                timeout: 5000
            });
        }
        else if ((now.getTime() - lastUpdateDate.getTime()) < millisPerMinute) {
            GriffinCommon.log("Less than a minute since last query. (Griffin Ignores you for 10 damage).", true, false, true);
        }
        else{
            // TODO: filter results of getUpdated by Ownership criteria (is there any point in doing it then, esp given it's causing pain elsewhere?)
            GriffinCommon.log("Synchronising contacts (getUpdated)...", true, true, false);
            sforce.connection.getUpdated("Contact", lastUpdateDate, now, {
                onSuccess: function(result){
                    sforce.connection.retrieve(retreiveFields, "Contact", result.getArray("ids"), {
                        onSuccess: fn_updateMethod,
                        onFailure:  function(err){
                            GriffinCommon.log(err, true, false, true);
                        },
                        timeout: 5000
                    });
                },
                onFailure: function(err){
                    GriffinCommon.log(err, true, false, true);
                },
                timeout: 5000
            });
        }
    },
    
    beginSynchContacts: function(){
        var synchContactDir = GriffinCommon.getPrefValue("synchContactDir", "string");
        if(synchContactDir == "BOTH" ||
           synchContactDir == "SFDC") {
           
            GriffinCommon.log("Synchronising contacts...", true, true, false);
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
            
            var prefTime = GriffinCommon.getPrefValue("lastSynch", "string");
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
        GriffinCommon.log("updateABFromContacts - " + contacts.length + " contacts to synch", true, false, true);
        var abDirUri = "moz-abmdbdirectory://abook.mab";
        var defaultDirectory = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService).GetResource(abDirUri).QueryInterface(Components.interfaces.nsIAbDirectory);
        var fieldMap = GriffinCommon.getFieldMap("Contact");
        for(var i = 0; i < contacts.length; i++){
            GriffinCommon.log("Synchronising updates (" + (i + 1) + "/" + contacts.length + ").", true, true, false);
            GriffinCommon.log("Id: " + contacts[i].Id, true, false, true);
            window.setTimeout("document.getElementById('synch_progress').value = " + ((i + 1) * 100 / contacts.length), 0);
            var currContact = contacts[i];
            
            var matchObj = GriffinCommon.getCardForContact(currContact, fieldMap);
            // Should have found the matchObj by now otherwise we're adding a new card.
            var newCard = (matchObj == null);
            var cardMatch = null;
            if(newCard){
                GriffinCommon.log("Contact not found - Creating new card.", true, false, true);
                cardMatch = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
            }
            else{
                GriffinCommon.log("Contact found - Updating card.", true, false, true);
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
        var propogateDeletions = GriffinCommon.getPrefValue("synchDeletions", "propogateDeletions");
        if(propogateDeletions){
            //TODO: Should probably synch deletions here :-)
            //TODO: Not relevant at this code point. But need to synch deletions in thunderbird to salesforce too.
        }
        document.getElementById("synch_progress").value = 100;
        // TODO: Fix up the time that we're setting the last synch to. Must set to the time we set in salesforce query, not time update ends.
        var now = new Date();
        GriffinCommon.setPrefValue("lastSynch", now.getTime(), "string");
        GriffinCommon.log("Griffin Status", false, true, false);
    },
    
    setProps: function(card, fieldMap, contact){
        for(var i = 0; i < fieldMap.length; i++){
            var tbirdFld = fieldMap[i].tbirdField;
            var sfdcFld = fieldMap[i].sfdcField;
            card[tbirdFld] = contact[sfdcFld];
        }
    },
    
    getFolderByName: function(fldName){
        return null;
    },

    // Taken from extensions.js loaded when the add on manager comes up.
    openURL: function (aURL) {
        var uri = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService).newURI(aURL, null, null);
        var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
        protocolSvc.loadUrl(uri);
    }

};

window.addEventListener("load", GriffinMessage.onLoad, false);