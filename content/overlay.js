var GriffinMessage = {  
    onLoad: function(){
        alert('Javascript successfully injected.');
    },
  
    addMessageToSalesforce: function(){
        alert('Adding Message to salesforce...');
        if(sforce.Connection.sessionId == null){
            // TODO: Globalise title.
            alert('Please Login...');
            var winLogin = window.openDialog('chrome://griffin/content/login.xul', 'login', 'modal');
        }
    }
};

window.addEventListener('load', GriffinMessage.onLoad, false);