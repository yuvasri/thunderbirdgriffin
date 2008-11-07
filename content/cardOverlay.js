var sforce;
var GriffinCard = {
    onLoad: function(){
        // Def: abCardOverlay.js
        RegisterSaveListener(GriffinCard.saveCardToSFDC);
    },

    saveCardToSFDC: function(){
        if(!GriffinCommon.ensureLogin()) {
            // TODO: Make some backup mechanism for saving contact info to sfdc.
            GriffinCommon.log("Changes not saved to salesforce! What am I going to do!!", true, false, true);
            return;
        }
        
        var synchContactDir = GriffinCommon.getPrefValue("synchContactDir", "string");
        if(synchContactDir == "BOTH" ||
            synchContactDir == "TBIRD") {
            // Def: abCardOverlay.js
            // holds the edited version of the card.
            var fieldMap = GriffinCommon.getFieldMap("Contact");
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
                    GriffinCommon.log("failed to create contact " + result[0], true, false, true);
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