var GriffinMessage = {  
    onLoad: function(){
    },
  
    addMessageToSalesforce: function(e){
        if(sforce.Connection.sessionId == null){
            var dialog = window.openDialog('chrome://griffin/content/login.xul', '_blank', 'modal');
        }        
        if(sforce.Connection.sessionId == null){
            return;
        }
        alert();
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);