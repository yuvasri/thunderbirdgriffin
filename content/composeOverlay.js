// TODO: Try to find a way to trick salesforce into tracking messages as per HTML emails sent within salesforce.

var Gfn_Compose = { 
    sendListener: function(evt){
        
        if(!document.getElementById("btn_gfn_salesforceAdd").checked){
            return true;
        }
        GriffinCommon.log("Adding message to salesforce (compose)", true, false, true);
        if(!GriffinCommon.ensureLogin()){
            GriffinCommon.log("Failed to add messge to salesforce (compose)! User didn't log-in.", true, false, true);
            return true;
        }
        
    }
};

document.getElementById("msgcomposeWindow").addEventListener("compose-send-message", Gfn_Compose.sendListener, false);