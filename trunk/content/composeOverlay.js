// TODO: Try to find a way to trick salesforce into tracking messages as per HTML emails sent within salesforce.

var Gfn_Compose = { 

    sendListener: {
          onStopSending: function(aMsgID, aStatus, aMsg, returnFileSpec){
            var logMsg = "onStopSending called.\naMsgID: " + aMsgID  + "\naStatus: " + aStatus + "\naMsg: " + aMsg + "\nreturnFileSpec: " + returnFileSpec;
            alert(logMsg);
            GriffinCommon.log(logMsg, true, false, true);
          },
          onGetDraftFolderURI: function (folderURI )   {},
          onProgress: function  (msgID ,progress ,progressMax )   {},
          onSendNotPerformed: function  (msgID ,status )   {},
          onStartSending: function  (msgID ,msgSize )   {},
          onStatus: function  (msgID ,msg )   {
            var logMsg = "onStatus called.\nmsgID: " + msgID  + "\nmsg: " + msg;
            alert(logMsg);
            GriffinCommon.log(logMsg, true, false, true);
          }
    },
    
    onLoad: function(){
        try{
            GriffinCommon.logProps(gMsgCompose);
            GriffinCommon.log("calling gMsgCompose.addMsgSendListener", true, false, true);     
            gMsgCompose.QueryInterface(Components.interfaces.nsIMsgCompose).addMsgSendListener(Gfn_Compose.sendListener);
        }catch(e){
            alert(e);
            GriffinCommon.log(e, true, false, true);
       }
    },

    sendListenerHook: function(evt){        
        GriffinCommon.logProps(evt);     
        GriffinCommon.log(evt, true, false, true);
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

window.addEventListener("load", Gfn_Compose.onLoad, false);
document.getElementById("msgcomposeWindow").addEventListener("compose-send-message", Gfn_Compose.sendListenerHook, false);