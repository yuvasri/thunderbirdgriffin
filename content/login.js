var GriffinLogin = {
    login: function(){
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        try{
            var loginResult = window.opener.sforce.connection.login(username, password);
            window.opener.sforce.connection.serverUrl = loginResult.serverUrl;
            self.close();
       } catch(error) {
            var consoleService = Components.classes["@mozilla.org/consoleservice;1"].
                getService(Components.interfaces.nsIConsoleService);

            consoleService.logStringMessage(error);
            
            var lbl = document.getElementById('errMsg');
            var text = 'Unknown error whilst logging in.';
            if(error.detail)
            {
                text = error.detail.fault.exceptionMessage;
            }
            var messageNode = document.createTextNode(text);
            if(lbl.hasChildNodes()){
                lbl.replaceChild(messageNode, lbl.lastChild);
            }
            else{
                lbl.appendChild(messageNode);
            }
       }       
    }
};