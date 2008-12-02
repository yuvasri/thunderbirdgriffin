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
}

Griffin.Crm.prototype.invoke = function(method, params, hdrParams, callback){
    var asynch = callback && callback != null;
    if(!hdrParams){
        hdrParams = new SOAPClientParameters();
    }
    var retVal = SOAPClient.invoke(this.endpoint, method, params, hdrParams, asynch, callback, this.ns);
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
};

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

Griffin.SupportedCRMs.Salesforce.insert = function(sObjects){
    var header = this._getHeader();
    var sObjectsParams = new SOAPClientParameters();
    for(var i = 0; i < sObjects.length; i++){
        var currObj = new SOAPClientParameters();
        for(prop in sObjects[i]){
            currObj.add(prop, sObjects[i][prop]);
        }
        sObjectsParams.add("sObjects", currObj);
    }
    var result = this.invoke("create", sObjectsParams, header);
    Griffin.Logger.log(result.toString(), true);
    return result.createResponse.result.success;
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
}

Griffin.SupportedCRMs.Zoho.insert = function(objects){
    if(!objects || objects == null || objects.length == 0){
        throw "Objects must be a valid array!";
    }
    if(!this.isLoggedIn){
        throw "login call must have been performed prior to inserting records.";
    }
    var type = objects[0].type;
    var prevEndpoint = this.endpoint;
    this.endpoint = this.endpoint + type + "insertRecords?loginName=" + this.username + "&apikey=" + this.apiKey;
    var soapParams = new SOAPClientParameters();
    for(var i = 0; i < objects.length; i++){
        var thisRow = new SOAPClientParameters();        
        for(prop in objects[i]){
            var addedObj = currObj.add("fieldlabel", objects[i][prop]);
            addedObj["value"] = prop;
        }
        var row = soapParams.add("row", thisRow);
        row["no"] = i;
    }
    try{
        this.invoke(type, soapParams);
    }
    finally{
        this.endpoint = prevEndpoint;
    }
    
}

function SOAPClientParameters()
{
	var _pl = new Array();
	
	this.add = function(name, innerText) 
	{
	    var newObj = {name: name, innerText: innerText};
	    _pl.push(newObj);
	    return newObj;
	};
	
	this.cleanStringXml = function(string){
	    return string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	};
	
	// Expect value to be primative type or another instance of SOAPClientParameters at this point.
	this._toXml = function(obj, nsPrefix){
	    var xml = "<";
	    if(nsPrefix){
	        xml += nsPrefix + ":";
	    }
	    for(prop in obj){
	        if(prop != "name" && prop != "innerText"){
	            xml += " " + prop + "=\"" + this.cleanStringXml(obj[prop]) + "\""
	        }
	    }
	    xml += obj.name + ">";
	    if(obj instanceof SOAPClientParameters){
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
    invoke: function(url, method, parameters, headerParameters, async, callback, ns)
    {
	    // build SOAP request
	    
	    var sr = 
				    "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
				    "<soap:Envelope " +
				    (ns ? "xmlns:myns=\"" + ns + "\" " : "") +
				    "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
				    "<soap:Header>" + headerParameters.toXml(ns ? "myns" : undefinedv) + "</soap:Header>" +
				    "<soap:Body>" +
				    "<myns:" + method + ">" +
				    parameters.toXml(ns ? "myns" : undefined) +
				    "</myns:" + method + "></soap:Body></soap:Envelope>";
	    Griffin.Logger.log("CRMApi.js\r\nUrl: " + url + "\r\n" + sr, true);
	    // send request
	    var xmlHttp = new XMLHttpRequest();
	    xmlHttp.open("POST", url, async);
	    var soapaction = ((ns.lastIndexOf("/") != ns.length - 1) ? ns + "/" : ns) + method;
	    xmlHttp.setRequestHeader("SOAPAction", soapaction);
	    xmlHttp.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
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
    },
   
    parseResult: function(xmlHttp, method, callback){
        Griffin.Logger.log("CRMApi.js\r\n" + xmlHttp.responseText, true);
        var errs = xmlHttp.responseXML.getElementsByTagName("Fault");
        if(errs.length > 0){
            throw SOAPClient.DOM2Obj(errs[0]);
        }
        else 
            return SOAPClient.DOM2Obj(xmlHttp.responseXML.getElementsByTagName("Body")[0]);
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
                obj[currChild.nodeName] = null;
            }
            else if(currChild.childNodes.length == 1 && currChild.firstChild.nodeType == Node.TEXT_NODE){
                obj[currChild.nodeName] = currChild.firstChild.nodeValue;
            }
            else{
                obj[currChild.nodeName] = SOAPClient.DOM2Obj(currChild);
            }
        }
        obj.toString = function(indent){
            var string = "";
            for(prop in this){
                if(typeof prop == "function"){
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
}