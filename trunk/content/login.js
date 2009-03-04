var GriffinLogin = {
    login: function(){
        var username = document.getElementById("username").value;
        var password = document.getElementById("password").value;
        var url = document.getElementById("serverUrl").value;
        try{
            GriffinCommon.api.endpoint = url;
            GriffinCommon.api.login(username, password, function(){ 
                if(document.getElementById("rememberMe").checked){
                    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManager);
                    passwordManager.addUser(url, username, password);
                }
                self.close();
            });
       } catch(error) {
            Griffin.Logger.log(error, true, false, true);
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
            throw error;
       }
    },
    
    setLoginParams: function(selCrm){        
        var url = Griffin.Prefs.getPrefValue(selCrm + ".serverUrl", "string");
        var credentials = GriffinCommon.getCredentialsForUrl(url);
        document.getElementById("serverUrl").value = url;
        if(credentials != null){
            document.getElementById("username").value = credentials.user;
            document.getElementById("password").value = credentials.password;
            document.getElementById("rememberMe").checked = true;
        }
        else{
            document.getElementById("username").value = "";
            document.getElementById("password").value = "";
            document.getElementById("rememberMe").checked = false;
        }
    },
    
    toggleCrm: function() {
        if(window.confirm("This will immediately change your selected crm system. Are you sure?")){
            var selCrm = document.getElementById("mlSelectedCRM").selectedItem.value;
            Griffin.Prefs.setPrefValue("crmSystem", selCrm, "string");
            GriffinCommon.api = Griffin.CrmApi.GetApi(selCrm);
            GriffinLogin.setLoginParams(selCrm);
            return true;
        }
        else{            
            var selCrm = Griffin.Prefs.getPrefValue("crmSystem", "string");
            document.getElementById("mlSelectedCRM").selectedItem = document.getElementById("miCrm" + selCrm);
            return false;
        }
    },
    
    onLoad: function(){
        var selCrm = Griffin.Prefs.getPrefValue("crmSystem", "string");
        document.getElementById("mlSelectedCRM").selectedItem = document.getElementById("miCrm" + selCrm);
        GriffinLogin.setLoginParams(selCrm);
    }
};

window.addEventListener("load", GriffinLogin.onLoad, false);