var Griffin;
if (!Griffin) {
    Griffin = {};
}

Griffin.FieldMap = function(tbirdField, sfdcField, strength){
    this.tbirdField = tbirdField;
    this.sfdcField = sfdcField;
    this.strength = strength;
}