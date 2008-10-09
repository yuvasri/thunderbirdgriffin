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
            var task = new sforce.SObject('Task');
            var hdr = messenger.msgHdrFromURI(messages[i]);
            task.Subject = hdr.subject;
            tasks.push(task);
        }
        sforce.connection.create(tasks);
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);