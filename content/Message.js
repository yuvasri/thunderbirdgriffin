var Griffin;
if (!Griffin) {
    Griffin = {};
}

//TODO: Give contacts a similar object to messages, to provide extensibility with extra fields.

// Constructor
Griffin.Message = function(uri){
    this.uri = uri;
    this.innerMessage = messenger.msgHdrFromURI(uri);
    this.body = this.getBody();
    this.contactId = this.getContactId();
    this.date = this.getDate();
};

Griffin.Message.prototype.getDate = function(){
    // this.innerMessage.date appears to be in ticks - convert to millis and format it sfdc style to make usable.
    var myDate = new Date();
    myDate.setTime(this.innerMessage.date / 1000);
    return GriffinCommon.formatDateSfdc(myDate);
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
        Griffin.Logger.log("error while getting message content: " + ex, true, false, true)
    }
    return content;
};

Griffin.Message.prototype.getContactId = function(){
    var id = "";
    // TODO: A way of getting an nsIAbCard from a message Uri (or a list of likely ones?).
    return id;
};

Griffin.Message.prototype.getField = function(fld){
    if(this.hasOwnProperty(fld)){
        return this[fld];
    }
    if(this.innerMessage.hasOwnProperty(fld)){
        return this.innerMessage[fld];
    }
    else 
        return fld;
};