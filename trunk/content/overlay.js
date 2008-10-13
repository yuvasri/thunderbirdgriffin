var GriffinMessage = {  
    onLoad: function(){
    },
  
    addMessageToSalesforce: function(e){
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);

        if(sforce.connection.sessionId == null){
            var dialog = window.openDialog('chrome://griffin/content/login.xul', '_blank', 'modal');
        }        
        if(sforce.connection.sessionId == null){
            // user didn't log-in... stop there.
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
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);