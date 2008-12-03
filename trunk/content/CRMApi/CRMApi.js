﻿if (!Griffin){
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
    if(!hdrParams){
        hdrParams = new SOAPClientParameters();
    }
    if(!action){
        action = "POST";
    }
    var retVal = SOAPClient.invoke(this.endpoint, method, params, hdrParams, asynch, callback, this.ns, action);
    if(!asynch){
        Griffin.Logger.log(retVal.toString(0), true);
    }
    return retVal;
};

Griffin.Crm.prototype.validateOwnerShip = function(ownership){
    if(ownership == "ME" || ownership == "ALL"){
        return true;
    }
    else if(this.crmName == "Zoho"){
        // Cannot use "MYTEAM" in Zoho
        return false;
    }
    else if(this.crmName == "Salesforce"){
        return ownership == "MYTEAM";
    }
    else{
        // Ownership parameter not recognised.
        return false;
    }
};

// Derived crm interfaces should override these with functions to do the right thing.
Griffin.Crm.prototype.getFields = null;
Griffin.Crm.prototype.login = null;
Griffin.Crm.prototype.insert = null;

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
    var result = this.invoke("login", params);
    this.sessionId = result.loginResponse.result.sessionId;
    this.endpoint = result.loginResponse.result.serverUrl;
    this.isLoggedIn = true;
    return true;
};

Griffin.SupportedCRMs.Salesforce.query = function(object, modifiedSince, ownership, fields){
    if(!ownership){
        this.ownership = "ME";
    }
    if(!this.validateOwnerShip()){
        throw "Invalid ownership";
    }
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

/*
<se:Envelope xmlns:se="http://schemas.xmlsoap.org/soap/envelope/">
<se:Header xmlns:sfns="urn:partner.soap.sforce.com"/>
<se:Body>
<describeSObject xmlns="urn:partner.soap.sforce.com" xmlns:ns1="sobject.partner.soap.sforce.com">
<sObjectType>Contact</sObjectType></describeSObject></se:Body>
</se:Envelope>
*/
// TODO: Extract FieldInfos from result of describeSObject.
Griffin.SupportedCRMs.Salesforce.getFields = function(obj){
    var hdr = this._getHeader();    
    var describeSObjectParams = new SOAPClientParameters();
    describeSObjectParams.add("sObjectType", obj);
    var result = this.invoke("describeSObject", describeSObjectParams, hdr);
    return result;
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

// TODO: Zoho.getFields improvement. Could get one record of correct type and extract fields from that? In fact need to, as this doesn't take account of custom fields yet.
Griffin.SupportedCRMs.Zoho.getFields = function(obj){
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
            throw {message: "object type " + obj + " not defined!"}
    }
};

Griffin.SupportedCRMs.Zoho.insert = function(type, objects){
    if(!objects || objects == null || objects.length == 0){
        throw "Objects must be a valid array!";
    }
    if(!this.isLoggedIn){
        throw "login call must have been performed prior to inserting records.";
    }
    var prevEndpoint = this.endpoint;
    for(var i = 0; i < objects.length; i++){
        var wrapRow = new SOAPClientParameters();
        
        var fieldsList = new SOAPClientParameters();        
        for(prop in objects[i]){
            if(typeof(objects[i][prop]) != "function"){
                var addedObj = fieldsList.add("fieldlabel", objects[i][prop]);
                addedObj["value"] = prop;
            }
        }
        var row = wrapRow.add("row", fieldsList);
        row["no"] = 1;
        var xmlData = "<" + type + ">" + wrapRow.toXml() + "</" + type + ">";
        this.endpoint = this.endpoint + type + "/insertRecords?loginName=" + this.username + "&apikey=" + this.apiKey + "&xmlData=" + encodeURIComponent(xmlData);
        try{
            this.invoke(undefined, undefined, undefined, undefined, "GET");
        }
        finally{
            this.endpoint = prevEndpoint;
        }   
    }  
};

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
	    if(action == "POST"){
	        sr =    "<?xml version=\"1.0\" encoding=\"utf-8\"?>" + 
	                "<soap:Envelope " + (ns ? "xmlns:myns=\"" + ns + "\" " : "") + "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
			        "<soap:Header>" + headerParameters.toXml(ns ? "myns" : undefined) + 
			        "</soap:Header>" +
			        "<soap:Body>" +
			        "<" + (ns ? "myns:" : "") + method + ">" +
			        parameters.toXml(ns ? "myns" : undefined) +
			        "</" + (ns ? "myns:" : "") + method + "></soap:Body></soap:Envelope>";
		
		}
	    Griffin.Logger.log("CRMApi.js\r\nUrl: " + url + "\r\n" + sr, true);
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
		    return SOAPClient.parseResult(xmlHttp, method, callback );
		return null;
    },
   
    parseResult: function(xmlHttp, method, callback){
        Griffin.Logger.log("CRMApi.js\r\n" + xmlHttp.responseText, true);
        var errs = xmlHttp.responseXML.getElementsByTagName("Fault"); // SFDC uses this
        if(errs.length > 0)
            throw SOAPClient.DOM2Obj(errs[0]);
        errs = xmlHttp.responseXML.getElementsByTagName("error"); // Zoho uses this
        if(errs.length > 0)
            throw SOAPClient.DOM2Obj(errs[0]);
        var response = xmlHttp.responseXML.getElementsByTagName("Body"); // SFDC uses this
        if(response.length > 0)
            return SOAPClient.DOM2Obj(response[0]);
        response = xmlHttp.responseXML.getElementsByTagName("response"); // Zoho uses this
        if(response.length > 0)
            return SOAPClient.DOM2Obj(response[0]);
        throw "Could not parse return message!"
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
            if(currChild.nodeType == Node.TEXT_NODE){
                continue;
            }
            if(currChild.childNodes.length == 0){
                SOAPClient.appendResult(obj, currChild.nodeName, null);
            }
            else if(currChild.childNodes.length == 1 && currChild.firstChild.nodeType == Node.TEXT_NODE){
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