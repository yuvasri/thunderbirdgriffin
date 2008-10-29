var sforce;
var GriffinCard = {
    onLoad: function(){
        // Def: abCardOverlay.js
        RegisterSaveListener(GriffinCard.saveCardToSFDC);
    },

    saveCardToSFDC: function(){
        if(!GriffinCommon.ensureLogin()) {
            GriffinCommon.log("Changes not saved to salesforce! What am I going to do!!");
            return;
        }
        
        var synchContactDir = GriffinCommon.getPrefValue("synchContactDir", "string");
        if(synchContactDir == "BOTH" ||
            synchContactDir == "TBIRD") {
            // Def: abCardOverlay.js
            // holds the edited version of the card.
            var fieldMap = GriffinCommon.getContactFieldMap();
            var contact = GriffinCard.setContactVals(gEditCard.card, fieldMap);
            var result;     
            if(contact.Id.length > 0){
                result = sforce.connection.update([contact]);
            }
            else{
                result = sforce.connection.create([contact]);
                if(result[0].getBoolean("success")){
                    gEditCard.card[GriffinCard.getIdField(fieldMap)] = result[0].id;
                }
                else{
                    GriffinCommon.log("failed to create account " + result[0]);
                }
            }
            return result[0].getBoolean("success");
        }
        return true;
    },
    
    getIdField: function(fieldMap){
        for(var i = 0; i < fieldMap.length; i++){
            if(fieldMap[i].sfdcField == "Id"){
                return fieldMap[i].tBirdField;
            }
        }
        return null;
    },
    
    setContactVals: function(card, fieldMap){
        var contact = new sforce.SObject("Contact");
        for(var i = 0; i < fieldMap.length; i++){
            var currMapping = fieldMap[i];
            contact[currMapping.sfdcField] = card[currMapping.tBirdField];
        }
        return contact;
    }
};

window.addEventListener('load', GriffinCard.onLoad, false);