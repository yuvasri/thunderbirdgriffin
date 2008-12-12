function SOAPClientParameters()
{
	var _pl = new Array();
	
	this.add = function(name, innerText) 
	{
	    var newObj = {name: name, innerText: innerText};
	    _pl.push(newObj);
	    return newObj;
	};
	
	// TODO: Cache regexes?
	this.cleanStringXml = function(str){
	    return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	};
	
	// Expect value to be primative type or another instance of SOAPClientParameters at this point.
	this._toXml = function(obj, nsPrefix){
	    var xml = "<";
	    if(nsPrefix){
	        xml += nsPrefix + ":";
	    }
	    xml += obj.name;
	    for(prop in obj){
	        if(prop != "name" && prop != "innerText"){
	            xml += " " + prop + '="' + this.cleanStringXml(obj[prop]) + '"';
	        }
	    }
	    xml += ">";
	    if(obj.innerText instanceof SOAPClientParameters){
	        xml += obj.innerText.toXml(nsPrefix);
	    }
	    else if(obj != null){
	        xml += this.cleanStringXml(obj.innerText.toString());
	    }
	    xml += "</";
	    if(nsPrefix){
	        xml += nsPrefix + ":";
	    }
	    return xml + obj.name + ">";
	};
	
	this.toXml = function(nsPrefix)
	{
		var xml = "";
		for(var pIdx = 0; pIdx < _pl.length; pIdx++)
		{
			if(typeof(_pl[pIdx]) != "function")
				xml += this._toXml(_pl[pIdx], nsPrefix);
		}
		return xml;	
	};
	
}

var SOAPClient = {
    invoke: function(url, method, parameters, headerParameters, async, callback, ns, action)
    {
	    // build SOAP request
	    var sr;
	    if(action == "POST" && parameters){
	        sr =    "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + 
	                "<soap:Envelope " + (ns ? "xmlns:myns=\"" + ns + "\" " : "") + "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
			        (headerParameters ? ("<soap:Header>" + headerParameters.toXml(ns ? "myns" : undefined) + "</soap:Header>") : "") +
			        "<soap:Body>" +
			        "<" + (ns ? "myns:" : "") + method + ">" +
			        parameters.toXml(ns ? "myns" : undefined) +
			        "</" + (ns ? "myns:" : "") + method + "></soap:Body></soap:Envelope>";
		
		}
	    //Griffin.Logger.log("CRMApi.js\r\nUrl: " + url + "\r\n" + sr, true);
	    // send request
	    var xmlHttp = new XMLHttpRequest();
	    xmlHttp.open(action, url, async);
	    if(ns){
	        var soapaction = ((ns.lastIndexOf("/") != ns.length - 1) ? ns + "/" : ns) + method;
	        xmlHttp.setRequestHeader("SOAPAction", soapaction);
	    }
	    if(action == "POST"){
	        xmlHttp.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
	    }
	    if(async) 
	    {
		    xmlHttp.onreadystatechange = function() 
		    {
			    if(xmlHttp.readyState == 4)
				    SOAPClient.parseResult(xmlHttp, method, callback );
		    }
	    }
	    xmlHttp.send(sr);
	    if (!async)
		    return SOAPClient.parseResult(xmlHttp, method);
		return null;
    },
   
    parseResult: function(xmlHttp, method, callback){
        //Griffin.Logger.log("CRMApi.js\r\n" + xmlHttp.responseText, true);
        var errs = xmlHttp.responseXML.getElementsByTagName("Fault"); // SFDC uses this
        if(errs.length == 0)
            errs = xmlHttp.responseXML.getElementsByTagName("error"); // Zoho uses this
        if(errs.length > 0){
            var errObj = SOAPClient.DOM2Obj(errs[0]);
            if(callback){
                callback.onFailure(errObj);        
                return null;
            }
            else
                return errObj;
        }       
          
        var response = xmlHttp.responseXML.getElementsByTagName("Body"); // SFDC uses this
        if(response.length == 0)
            response = xmlHttp.responseXML.getElementsByTagName("response"); // Zoho uses this
        if(response.length == 0) {
            var err = "Could not parse return message, no body Tag recognised.";
            if(callback){
                callback.onFailure(err);
                return null;
            }
            else{
                throw err;
            }
        }
        var retVal = SOAPClient.DOM2Obj(response[0]);
        if(callback){
            callback.onSuccess(retVal);
            return null;
        }
        else
            return retVal;
    },
    
    appendResult: function(obj, nodeName, nodeValue){        
        if(obj[nodeName]){
            if(obj[nodeName] instanceof Array){
               obj[nodeName].push(nodeValue); 
            }
            else{
                var newArr = new Array();
                newArr.push(obj[nodeName]);
                newArr.push(nodeValue);
                obj[nodeName] = newArr;
            }
        }
        else{
           obj[nodeName] = nodeValue;
        }
    },
    
    DOM2Obj: function(node){
        var obj = {};
        for(var attIdx = 0; attIdx < node.attributes.length; attIdx++){
            var currAtt = node.attributes[attIdx];
            obj[currAtt.nodeName] = currAtt.nodeValue;
        }
        for(var childIdx = 0; childIdx < node.childNodes.length; childIdx++){
            var currChild = node.childNodes[childIdx];
            if(currChild.nodeType == Node.TEXT_NODE || currChild.nodeType == node.CDATA_SECTION_NODE){
                SOAPClient.appendResult(obj, "innerText", currChild.nodeValue);
            }
            if(currChild.childNodes.length == 0){
                SOAPClient.appendResult(obj, currChild.nodeName, null);
            }
            else if(currChild.childNodes.length == 1 && currChild.attributes.length == 0 && currChild.firstChild.nodeType == Node.TEXT_NODE){
                SOAPClient.appendResult(obj, currChild.nodeName, currChild.firstChild.nodeValue);
            }
            else{
                SOAPClient.appendResult(obj, currChild.nodeName, SOAPClient.DOM2Obj(currChild));
            }
        }
        
        obj.toString = function(indent){
            var string = "";
            for(prop in this){
                if(prop == "toString"){
                    continue;
                }
                if(indent){
                    for(var i = 0; i < indent; i++){
                        string += "  ";
                    }
                }
                if(this[prop] == null){
                    string += prop + ": [NULL]\r\n"
                }
                else{
                    string += prop + ": " + this[prop].toString(indent + 1) + "\r\n";
                }
            }
            return string;
        }
        return obj;
    }
};





if (!Griffin){
    var Griffin = {};
}

Griffin.CrmApi = {
    GetApi: function (crmIdent){
        if(!crmIdent){
            crmIdent = Griffin.Prefs.getPrefValue("crmSystem", "string");
        }
        return Griffin.SupportedCRMs[crmIdent];
    }
};

Griffin.SupportedCRMs = {};

/*
Base CRM Client
*/

Griffin.Crm = function(ns, crmName){
    this.ns = ns;
    this.crmName = crmName;
    this.endpoint = Griffin.Prefs.getPrefValue(crmName + ".serverUrl", "string");
    this.isLoggedIn = false;
};

Griffin.Crm.prototype.invoke = function(method, params, hdrParams, callback, action){
    var asynch = callback && callback != null;
    if(!action){
        action = "POST";
    }
    var retVal = SOAPClient.invoke(this.endpoint, method, params, hdrParams, asynch, callback, this.ns, action);
    if(!asynch){
        //Griffin.Logger.log(retVal.toString(0), true);
    }
    return retVal;
};

Griffin.Crm.prototype.validateOwnerShip = function(ownership){
    if(ownership == "ME" || ownership == "ALL"){
        return true;
    }
    else{
        // Ownership parameter not recognised.
        return false;
    }
};


// TODO: Unstink-ify the padLeft function (there must be a way!!).
Griffin.Crm.prototype._padLeft = function(inString, padChar, targetLen){
    while(inString.length < targetLen){
        inString = padChar + inString;
    }
    return inString;
};

Griffin.Crm.prototype._ensureArray = function(obj){
    if(obj == undefined)
        return [];
    if(obj instanceof Array)
        return obj;
    else 
        return [obj];
}

// Converts a date to UTC and formats in the style yyyy-MM-ddYhh:mm:ssZ 
Griffin.Crm.prototype.formatDate = function(inDate){
    var year = this._padLeft(inDate.getUTCFullYear().toString(), "0", 4);
    // Gotcha! getMonth runs from 0-11, so add one to result!
    var month = this._padLeft((inDate.getUTCMonth() + 1).toString(), "0", 2); 
    var day = this._padLeft(inDate.getUTCDate().toString(), "0", 2);
    var hour = this._padLeft(inDate.getUTCHours().toString(), "0", 2);
    var minute = this._padLeft(inDate.getUTCMinutes().toString(), "0", 2);
    var second = this._padLeft(inDate.getUTCSeconds().toString(), "0", 2);
    return year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + "Z";
};

// Derived crm interfaces should override these with functions to do the right thing.

// Should usually be the first function called before doing anything else.
Griffin.Crm.prototype.login = function(username, password){};

// Returns an array of Griffin.Crm.FieldInfo objects describing the fields of an input object.
Griffin.Crm.prototype.getFields = function(type, callback){}; 

// Return an array of ids of newly created object Ids. Must preserve ordering of inputs!
Griffin.Crm.prototype.insert = function(type, arrRecords){}; 

// Update or insert, based on the existance of the uniqueId for this crm. returns id if inserted.
// records *MUST* have the correct uniqueId populated if an update is to be performed.
Griffin.Crm.prototype.upsert = function(type, record){};
 
// Returns an array of objects with appropriate fields set. More fields may be set than specified in fields parameter.
Griffin.Crm.prototype.getRecords = function(type, modifiedSince, ownership, fields, callback){}; 

// An array of FieldInfo objects should be returned from the getFields call.
Griffin.Crm.FieldInfo = function(name, label){
    this.name = name;
    this.label = label;
}

/*
Salesforce client
*/
Griffin.SupportedCRMs.Salesforce = new Griffin.Crm("urn:partner.soap.sforce.com", "Salesforce");
Griffin.SupportedCRMs.Salesforce.login = function (username, password){
    var params = new SOAPClientParameters();
    params.add("username", username);
    params.add("password", password);
    var result = this.invoke("login", params, undefined);
    this.sessionId = result.loginResponse.result.sessionId;
    this.endpoint = result.loginResponse.result.serverUrl;
    // userId useful for ownership limited queries, so save for later.
    this.userId = result.loginResponse.result.userId;
    this.isLoggedIn = true;
    return true;
};

Griffin.SupportedCRMs.Salesforce.insert = function(type, sObjects){
    var header = this._getHeader();
    var sObjectsParams = new SOAPClientParameters();
    for(var i = 0; i < sObjects.length; i++){
        var currObj = new SOAPClientParameters();
        for(prop in sObjects[i]){
            if(typeof(sObjects[i][prop]) != "function"){
                currObj.add(prop, sObjects[i][prop]);
            }
        }
        currObj.add("type", type);
        sObjectsParams.add("sObjects", currObj);
    }
    var result = this.invoke("create", sObjectsParams, header);
    return result.createResponse.result.success;
};

Griffin.SupportedCRMs.Salesforce.getFields = function(obj, callback){
    var hdr = this._getHeader();    
    var describeSObjectParams = new SOAPClientParameters();
    describeSObjectParams.add("sObjectType", obj);
    this.invoke("describeSObject", describeSObjectParams, hdr, {
        onSuccess: function(ret){
            var fields = ret.describeSObjectResponse.result.fields;
            var retArr = [];
            for(var i = 0; i < fields.length; i++){
                retArr.push(new Griffin.Crm.FieldInfo(fields[i].name, fields[i].label));
            }
            callback(retArr);
        },
        onFailure: function(err){
            throw err;
        }
    }
    );
};

Griffin.SupportedCRMs.Salesforce.getRecords = function(object, modifiedSince, ownership, fields, callback){
    var soql = "SELECT " + fields + " FROM " + object + " WHERE LastModifiedDate > " + this.formatDate(modifiedSince);
    var userInfo;
    if(ownership == "ME")
        soql += " AND OwnerId = '" + this.userId + "'";
    var hdr = this._getHeader();
    var params = new SOAPClientParameters();
    params.add("queryString", soql);
    var retVal = this.invoke("query", params, hdr, {
        onSuccess: function(retVal){            
            var records = [];
            var fieldsArr = fields.split(",");
            do{
                var done = retVal.queryResponse.result.done;
                var returnedRecords = GriffinCommon.api._ensureArray(retVal.queryResponse.result.records);
                for(var i = 0; i < returnedRecords.length; i++){
                    var currRec =  returnedRecords[i];
                    var obj = {};
                    for(var fldIdx = 0; fldIdx < fieldsArr.length; fldIdx++){
                        var currFld = fieldsArr[fldIdx];
                        var currFldVal = currRec["sf:" + currFld];
                        if(currRec["sf:" + currFld] instanceof Array)
                            obj[currFld] = currFldVal[0];                    
                        else
                            obj[currFld] = currFldVal;
                    }
                    records.push(obj);
                }
                if(!done){
                    params = new SOAPClientParameters();
                    params.add("queryLocator", retVal.queryResponse.result.queryLocator);
                    retVal = this.invoke("queryMore", params, hdr);            
                }
            } while (!done);
            callback(records);
        },
        onFailure: function(err){
            throw err;
        }
    });
};

Griffin.SupportedCRMs.Salesforce._getHeader = function(){
    var hdr = new SOAPClientParameters();
    var sessionHeader = new SOAPClientParameters();
    sessionHeader.add("sessionId", this.sessionId);
    hdr.add("SessionHeader", sessionHeader);
    return hdr;
};

/*
Zoho Client
*/
Griffin.SupportedCRMs.Zoho = new Griffin.Crm(undefined, "Zoho");

Griffin.SupportedCRMs.Zoho.login = function(username, apiKey){
    this.username = encodeURIComponent(username);
    this.apiKey = encodeURIComponent(apiKey);
    this.isLoggedIn = true;
    return true;
};

// TODO: Zoho.getFields cleanup.
Griffin.SupportedCRMs.Zoho.getFields = function(obj, callback){    
    if(!this.isLoggedIn){
        throw "login call must have been performed prior to getting fields.";
    }
    var prevEndpoint = this.endpoint;
    this.endpoint = this.endpoint + obj + "/getAllRecords" + this._loginQueryString() + "&fromIndex=1&toIndex=1";
    var retVal;
    var handleErr = function(e){
        if(e.code && e.code == 4832){
            switch(obj){
                case "Contacts": return [
                    new Griffin.Crm.FieldInfo("CONTACTID", "CONTACTID"),
                    new Griffin.Crm.FieldInfo("SMOWNERID", "SMOWNERID"),
                    new Griffin.Crm.FieldInfo("Contact Owner", "Contact Owner"),
                    new Griffin.Crm.FieldInfo("Lead Source", "Lead Source"),
                    new Griffin.Crm.FieldInfo("First Name", "First Name"),
                    new Griffin.Crm.FieldInfo("Last Name", "Last Name"),
                    new Griffin.Crm.FieldInfo("ACCOUNTID", "ACCOUNTID"),
                    new Griffin.Crm.FieldInfo("Account Name", "Account Name"),
                    new Griffin.Crm.FieldInfo("VENDORID", "VENDORID"),
                    new Griffin.Crm.FieldInfo("Vendor Name", "Vendor Name"),
                    new Griffin.Crm.FieldInfo("Email", "Email"),
                    new Griffin.Crm.FieldInfo("Title", "Title"),
                    new Griffin.Crm.FieldInfo("Department", "Department"),
                    new Griffin.Crm.FieldInfo("Phone", "Phone"),
                    new Griffin.Crm.FieldInfo("Home Phone", "Home Phone"),
                    new Griffin.Crm.FieldInfo("Other Phone", "Other Phone"),
                    new Griffin.Crm.FieldInfo("Fax", "Fax"),
                    new Griffin.Crm.FieldInfo("Mobile", "Mobile"),
                    new Griffin.Crm.FieldInfo("Date of Birth", "Date of Birth"),
                    new Griffin.Crm.FieldInfo("Assistant", "Assistant"),
                    new Griffin.Crm.FieldInfo("Asst Phone", "Asst Phone"),
                    new Griffin.Crm.FieldInfo("Reports To", "Reports To"),
                    new Griffin.Crm.FieldInfo("SMCREATORID", "SMCREATORID"),
                    new Griffin.Crm.FieldInfo("Created By", "Created By"),
                    new Griffin.Crm.FieldInfo("MODIFIEDBY", "MODIFIEDBY"),
                    new Griffin.Crm.FieldInfo("Modified By", "Modified By"),
                    new Griffin.Crm.FieldInfo("Created Time", "Created Time"),
                    new Griffin.Crm.FieldInfo("Modified Time", "Modified Time"),
                    new Griffin.Crm.FieldInfo("Common Status", "Common Status"),
                    new Griffin.Crm.FieldInfo("Mailing Street", "Mailing Street"),
                    new Griffin.Crm.FieldInfo("Other Street", "Other Street"),
                    new Griffin.Crm.FieldInfo("Mailing City", "Mailing City"),
                    new Griffin.Crm.FieldInfo("Other City", "Other City"),
                    new Griffin.Crm.FieldInfo("Mailing State", "Mailing State"),
                    new Griffin.Crm.FieldInfo("Other State", "Other State"),
                    new Griffin.Crm.FieldInfo("Mailing Zip", "Mailing Zip"),
                    new Griffin.Crm.FieldInfo("Other Zip", "Other Zip"),
                    new Griffin.Crm.FieldInfo("Mailing Country", "Mailing Country"),
                    new Griffin.Crm.FieldInfo("Other Country", "Other Country"),
                    new Griffin.Crm.FieldInfo("Description", "Description"),
                    new Griffin.Crm.FieldInfo("Email Opt Out", "Email Opt Out"),
                    new Griffin.Crm.FieldInfo("Skype ID", "Skype ID"),
                    new Griffin.Crm.FieldInfo("CAMPAIGNID", "CAMPAIGNID"),
                    new Griffin.Crm.FieldInfo("Campaign Source", "Campaign Source"),
                    new Griffin.Crm.FieldInfo("Salutation", "Salutation")];
                case "Tasks": return [
                    new Griffin.Crm.FieldInfo("ACTIVITYID", "ACTIVITYID"),
                    new Griffin.Crm.FieldInfo("SMOWNERID", "SMOWNERID"),
                    new Griffin.Crm.FieldInfo("Task Owner", "Task Owner"),
                    new Griffin.Crm.FieldInfo("Subject", "Subject"),
                    new Griffin.Crm.FieldInfo("Due Date", "Due Date"),
                    new Griffin.Crm.FieldInfo("Contact Name", "Contact Name"),
                    new Griffin.Crm.FieldInfo("Related To", "Related To"),
                    new Griffin.Crm.FieldInfo("Status", "Status"),
                    new Griffin.Crm.FieldInfo("Priority", "Priority"),
                    new Griffin.Crm.FieldInfo("SMCREATORID", "SMCREATORID"),
                    new Griffin.Crm.FieldInfo("Created By", "Created By"),
                    new Griffin.Crm.FieldInfo("MODIFIEDBY", "MODIFIEDBY"),
                    new Griffin.Crm.FieldInfo("Modified By", "Modified By"),
                    new Griffin.Crm.FieldInfo("Created Time", "Created Time"),
                    new Griffin.Crm.FieldInfo("Modified Time", "Modified Time"),
                    new Griffin.Crm.FieldInfo("Description", "Description"),
                    new Griffin.Crm.FieldInfo("Send Notification Email", "Send Notification Email")];
               default:
                    throw "object type " + obj + " not defined!";
            } // End switch
        } // End if
        else{
            // Unknown error code. Upchuck.
            throw e;
        }
    };
    try{
        this.invoke(undefined, undefined, undefined, {
            onSuccess: function(retVal){
                var retArr = [];
                var labels = GriffinCommon.api._ensureArray(retVal.result[obj].row.fieldlabel);
                for(var i = 0; i < labels.length; i++)
                    retArr.push(new Griffin.Crm.FieldInfo(labels[i].value, labels[i].value));
                callback(retArr);
            },
            onFailure: function(err){
                callback(handleErr(err));
            }
        }, "GET");
    }
    finally{
        this.endpoint = prevEndpoint;
    }
    return null;
};

Griffin.SupportedCRMs.Zoho.insert = function(type, objects){
    if(!objects || objects == null || objects.length == 0){
        throw "Objects must be a valid array!";
    }
    if(!this.isLoggedIn){
        throw "login call must have been performed prior to inserting records.";
    }
    var prevEndpoint = this.endpoint;
    var ids = [];
    for(var i = 0; i < objects.length; i++){
        var xml = this._getRecordXml(type, objects[i]);
        this.endpoint = this.endpoint + type + "/insertRecords" + this._loginQueryString() + "&xmlData=" + encodeURIComponent(xml);
        var retVal;
        try{
            retVal = this.invoke(undefined, undefined, undefined, undefined, "POST");
            // Assume that the first fieldlabel parameter of the recordDetail has id.
            ids.push(retVal.result.recorddetail.fieldlabel[0].innerText);
        }
        finally{
            this.endpoint = prevEndpoint;
        }
    }
    return ids;
};

Griffin.SupportedCRMs.Zoho.upsert = function(object, record){
    if(!this.isLoggedIn){
        throw "login call must have been performed prior to upserting records.";
    }
    var prevEndpoint = this.endpoint;
    var xml = this._getRecordXml(object, record);
    var idField = this._idFieldFromType(object);
    if(record[idField]){
        try{
            this.endpoint = this.endpoint + object + "/updateRecords" + this._loginQueryString() + "&xmlData=" + encodeURIComponent(xml) + "&id=" + record[idField];
            var res = this.invoke(undefined, undefined, undefined, undefined, "POST");
            return null; // TODO: Zoho.upsert handle case of invalid id (by inserting)
        }
        finally{
            this.endpoint = prevEndpoint;
        }
    }
    else{            
        try{
            this.endpoint = this.endpoint + object + "/insertRecords" + this._loginQueryString() + "&xmlData=" + encodeURIComponent(xml);
            var retVal = this.invoke(undefined, undefined, undefined, undefined, "POST");
            return retVal.result.recorddetail.fieldlabel[0].innerText;
        }
        finally{
            this.endpoint = prevEndpoint;
        }
    }
};

// NB Fields parameter is ignored.
Griffin.SupportedCRMs.Zoho.getRecords = function(object, modifiedSince, ownership, fields, callback){
    if(!this.isLoggedIn){
        throw "login call must have been performed prior to querying records.";
    }    
    var prevEndpoint = this.endpoint;
    this.endpoint = this.endpoint + object + "/" + (ownership == "MY" ? "getMyRecords" : "getAllRecords" ) + this._loginQueryString() + "&lastModifiedTime=" + encodeURIComponent(this.formatDate(modifiedSince));
    try{
        this.invoke(undefined, undefined, undefined, {
            onSuccess: function(retVal){            
                var rows = GriffinCommon.api._ensureArray(retVal.result[object].row);
                for(var i = 0; i < rows.length; i++){            
                    var obj = {};
                    var labels = GriffinCommon.api._ensureArray(rows[i].fieldlabel);
                    for(var j = 0; j < labels.length; j++){
                        var currField = labels[j];
                        var val = currField.innerText ? currField.innerText : null;
                        obj[currField.value] = (val == "null" ? null : val);
                    }
                    retArr.push(obj);
                }
                callback(retArr);
            },
            onFailure: function(e){               
                if(e.code && e.code == 4832){
                    // No data... not really an error as such.
                    callback([]);
                }
                else {
                    // Genuine error.
                    throw e;
                } 
            }
        }, "GET");
    }
    finally{
        this.endpoint = prevEndpoint;
    }
};

Griffin.SupportedCRMs.Zoho.formatDate = function(inDate){
    var year = this._padLeft(inDate.getUTCFullYear().toString(), "0", 4);
    // Gotcha! getMonth runs from 0-11, so add one to result!
    var month = this._padLeft((inDate.getUTCMonth() + 1).toString(), "0", 2); 
    var day = this._padLeft(inDate.getUTCDate().toString(), "0", 2);
    var hour = this._padLeft(inDate.getUTCHours().toString(), "0", 2);
    var minute = this._padLeft(inDate.getUTCMinutes().toString(), "0", 2);
    var second = this._padLeft(inDate.getUTCSeconds().toString(), "0", 2);
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
};

Griffin.SupportedCRMs.Zoho._idFieldFromType = function(objectType){
    switch(objectType){
        case "Contacts":
            return "CONTACTID";
        case "Tasks":
            return "ACTIVITYID";
    }
    throw "_idFieldFromType does not understand object " + objectType;
};

Griffin.SupportedCRMs.Zoho._loginQueryString = function(){
    return "?loginName=" + this.username + "&apikey=" + this.apiKey;
};

Griffin.SupportedCRMs.Zoho._getRecordXml = function(type, record){
    var wrapRow = new SOAPClientParameters();
    var fieldsList = new SOAPClientParameters();
    var idField = this._idFieldFromType(type);
    for(prop in record){
        if(typeof(record[prop]) != "function" && prop != idField){
            var addedObj = fieldsList.add("fieldlabel", record[prop]);
            addedObj["value"] = prop;
        }
    }
    var row = wrapRow.add("row", fieldsList);
    row["no"] = 1;
    var xmlData = "<" + type + ">" + wrapRow.toXml() + "</" + type + ">";
    return xmlData;
};