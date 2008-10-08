var GriffinMessage = {  
    onLoad: function(){
    },
  
    addMessageToSalesforce: function(e){
        if(sforce.Connection.sessionId == null){
            toOpenWindowByType('griffin:login', 'chrome://griffin/content/login.xul');
        }        
        if(sforce.Connection.sessionId == null){
            return;
        }
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);