var Griffin;
if (!Griffin) {
    Griffin = {};
}

// Constructor
Griffin.Contact = function(card){
    this.card = card;
};

Griffin.Contact.prototype.getField = function(fld){
    if(this.hasOwnProperty(fld)){
        return this[fld];
    }
    if(this.card.hasOwnProperty(fld)){
        return this.card[fld];
    }
    else 
        return fld;
};