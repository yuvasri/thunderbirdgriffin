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
            var li = document.createElement('listitem');
            var cell1 = document.createElement('listcell');
            var cell2 = document.createElement('listcell');
            var cell3 = document.createElement('listcell');
            cell1.setAttribute('label', currCardProp);
            cell2.setAttribute('id', 'sfField_' + currCardProp);
            cell3.setAttribute('id', 'strength_' + currCardProp);
            li.appendChild(cell1);
            li.appendChild(cell2);
            li.appendChild(cell3);
            gfn_lbContactFields.appendChild(li);
        }
        // Database retreive to add saved options.
        var MY_ID = "griffin@mpbsoftware.com";
        var em = Components.classes["@mozilla.org/extensions/manager;1"].
                 getService(Components.interfaces.nsIExtensionManager);
        // the path may use forward slash ("/") as the delimiter
        var file = em.getInstallLocation(MY_ID).getItemFile(MY_ID, "griffin.sqlite");
        var storageService = Components.classes["@mozilla.org/storage/service;1"]
                        .getService(Components.interfaces.mozIStorageService);
        var mDBConn = storageService.openDatabase(file);
        var statement = mDBConn.createStatement("SELECT tbirdField, sfdcField, strength FROM FieldMap WHERE object = 'Contact'");
        try {
            while (statement.executeStep()) {
                var tbirdField = statement.getString(0);
                var sfdcField = statement.getString(1);
                var strength = statement.getDouble(2);
                var cellSfdcField = document.getElementById('sfField_' + tbirdField);
                var cellStrength = document.getElementById('strength_' + tbirdField);
                cellSfdcField.setAttribute('label', sfdcField);
                cellStrength.setAttribute('label', strength);
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