var Griffin;
if (!Griffin) {
    Griffin = {};
}

// Constructor
Griffin.Message = function(uri){
    this.uri = uri;
    this.innerMessage = messenger.msgHdrFromURI(uri);
    this.body = this.getBody();
    this.contactId = this.getContactId();
};

// Uses global variables messenger and msgWindow. Lets hope they exist!
Griffin.Message.prototype.getBody = function(){      
    var content = "";
    var msgService = messenger.messageServiceFromURI(this.uri);
    var msgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
    var consumer = msgStream.QueryInterface(Components.interfaces.nsIInputStream);
    var scriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
    var scriptInputStream = scriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
    scriptInputStream.init(consumer);
    try {
        msgService.streamMessage(this.uri, msgStream, msgWindow, null, false, null);
        scriptInputStream.available();
        while (scriptInputStream .available()) {
            content = content + scriptInputStream.read(512);
        }
    } catch (ex) {
        GriffinCommon.log("error while getting message content: " + ex, true, false, true)
    }
    return content;
};

Griffin.Message.prototype.getContactId = function(){
    var id = "";
    
    return id;
};

Griffin.Message.prototype.getField = function(fld){
    if(this.hasOwnProperty(fld)){
        return this[fld];
    }
    return this.innerMessage[fld];
};