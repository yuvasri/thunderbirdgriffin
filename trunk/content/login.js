var GriffinLogin = {
    login: function(){
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        try{
            var result = window.opener.sforce.connection.login(username, password);
       } catch(error) {
            var consoleService = Components.classes["@mozilla.org/consoleservice;1"].
                getService(Components.interfaces.nsIConsoleService);

            consoleService.logStringMessage(error);

            // TODO: Better error trapping, and user alerting.
            alert("check your username and passwd, invalid login");
            
            return;
       }
       self.close();
    }
};