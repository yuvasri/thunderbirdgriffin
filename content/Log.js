if (!Griffin){
    var Griffin = {};
}

Griffin.Logger = {};

Griffin.Logger.logFile = "griffin.log";
            
Griffin.Logger.log = function(msg, error, status, persist){       
    if(error){
        // TODO: Use nsIConsoleMessage interface of @mozilla.org/scripterror;1 for logging to error console - flexibility.
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        var now = new Date();
        consoleService.logStringMessage(now.toLocaleTimeString() + ": " + msg);
    }
    if(status){
        var statusPanel = document.getElementById("gfn_status");
        if(statusPanel != null){
            statusPanel.setAttribute("label", msg);
        }
    }
    if(persist){
        // TODO: Make persistant logging to file work!!
//            var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
//            var logFile = em.getInstallLocation(GriffinCommon.extensionId).getItemFile(GriffinCommon.extensionId, Griffin.Logger.logFile);
//            if(!logFile.exists()){
//                // 468 (dec) = 666 (oct) -> rw permissions for all users? How did I calculate this? http://www.robolink.co.uk/calculators10.htm
//                logFile.create(logFile.NORMAL_FILE_TYPE, 438);
//            }
//            var obj = Components.classes["@mozilla.org/network/safe-file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
//            obj.init(logFile, -1, -1, 0);
//            obj.write(msg, msg.length);
//            obj.close();
    }
};