var GriffinLogin = {
    login: function(){
        var username = document.getElementById("username").value;
        var password = document.getElementById("password").value;
        var url = document.getElementById("url").value;
        try{
            window.opener.sforce.connection.serverUrl = url;
            var loginResult = window.opener.sforce.connection.login(username, password);
            window.opener.sforce.connection.serverUrl = loginResult.serverUrl;
            if(document.getElementById("rememberMe").checked){                
                var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
                passwordManager.addUser(url, username, password);
            }
            self.close();
       } catch(error) {
            GriffinCommon.log(error, true, false, true);
            var lbl = document.getElementById("errMsg");
            // TODO: Globalise
            var text = "Unknown error whilst logging in.";
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
    },
    
    onLoad: function(){
        document.getElementById("url").value = window.opener.sforce.connection.serverUrl;
    }
};

window.addEventListener("load", GriffinLogin.onLoad, false);