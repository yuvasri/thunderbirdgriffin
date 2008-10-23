var GriffinOptions = {
    abCardProps: [
    'firstName',
    'lastName',
    'phoneticFirstName',
    'phoneticLastName',
    'displayName',
    'nickName',
    'primaryEmail',
    'secondEmail',
    'workPhone',
    'homePhone',
    'faxNumber',
    'pagerNumber',
    'cellularNumber',
    'workPhoneType',
    'homePhoneType',
    'faxNumberType',
    'pagerNumberType',
    'cellularNumberType',
    'homeAddress',
    'homeAddress2',
    'homeCity',
    'homeState',
    'homeZipCode',
    'homeCountry',
    'workAddress',
    'workAddress2',
    'workCity',
    'workState',
    'workZipCode',
    'workCountry',
    'jobTitle',
    'department',
    'company',
    'aimScreenName',
    'anniversaryYear',
    'anniversaryMonth',
    'anniversaryDay',
    'spouseName',
    'familyName',
    'defaultAddress',
    'category',
    'webPage1',
    'webPage2',
    'birthYear',
    'birthMonth',
    'birthDay',
    'custom1',
    'custom2',
    'custom3',
    'custom4',
    'notes',
    'lastModifiedDate',
    'popularityIndex',
    'preferMailFormat',
    'isMailList',
    'mailListURI',
    'allowRemoteContent'],
    
    setContactList: function(){

        var gfn_lbContactFields = document.getElementById('gfn_lbContactFields');
        for(var i = 0; i < GriffinOptions.abCardProps.length; i++){
            var currCardProp = GriffinOptions.abCardProps[i];
            var li = document.createElement('richlistitem');
            li.setAttribute('id', currCardProp);
            var hbox = document.createElement('xul:hbox');
            var cell1 = document.createElement('xul:vbox');
            var cell2 = document.createElement('xul:vbox');
            var cell3 = document.createElement('xul:vbox');
            var lblTbrd = document.createTextNode(currCardProp);
            cell1.appendChild(lblTbrd);
            cell3.setAttribute('type', 'text');
            cell2.setAttribute('id', 'sfField_' + currCardProp);
            cell3.setAttribute('id', 'strength_' + currCardProp);
            hbox.appendChild(cell1);
            hbox.appendChild(cell2);
            hbox.appendChild(cell3);
            li.appendChild(hbox);
            gfn_lbContactFields.appendChild(li);
        }
        // Database retreive to add saved options.
        var mDBConn = GriffinCommon.getDbConnection();
        var statement = mDBConn.createStatement("SELECT tbirdField, sfdcField, strength FROM FieldMap WHERE object = 'Contact'");
        try {
            while (statement.executeStep()) {
                var tbirdField = statement.getString(0);
                var sfdcField = statement.getString(1);
                var strength = statement.getDouble(2);
                var cellSfdcField = document.getElementById('sfField_' + tbirdField);
                var cellStrength = document.getElementById('strength_' + tbirdField);
                cellSfdcField.setAttribute('label', sfdcField);
                cellStrength.value = strength;
            }
        } finally {
          statement.reset();
        }
    },
    
    onLoad: function() {
        GriffinOptions.setContactList();
    }
    
};

window.addEventListener('load', GriffinOptions.onLoad, false);