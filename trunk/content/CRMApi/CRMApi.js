GriffinCommon.log("Loading api.", true);

if (!Griffin){
    var Griffin = {};
}

Griffin.CrmApi = {
    GetApi: function (crmIdent){
        return Griffin.SupportedCRMs[crmIdent];
    }
};

Griffin.SupportedCRMs = {};


/*
Base CRM Client
*/

Griffin.Crm = function(ns){
    this.ns = ns;
    this.endpoint = GriffinCommon.getPrefValue("serverUrl", "string");
    this.isLoggedIn = false;
}

Griffin.Crm.prototype.invoke = function(method, params, hdrParams, callback){
    var asynch = callback && callback != null;
    if(!hdrParams){
        hdrParams = new SOAPClientParameters();
    }
    var retVal = SOAPClient.invoke(this.endpoint, method, params, hdrParams, asynch, callback, this.ns);
    if(!asynch){
        GriffinCommon.log(retVal.toString(0), true);
    }
    return retVal;
};

/*
Salesforce client
*/

Griffin.SupportedCRMs.Salesforce = new Griffin.Crm("urn:partner.soap.sforce.com");
Griffin.SupportedCRMs.Salesforce.login = function (username, password){
    var params = new SOAPClientParameters();
    params.add("username", username);
    params.add("password", password);
    var result = this.invoke("login", params);
    this.sessionId = result.loginResponse.result.sessionId;
    this.endpoint = result.loginResponse.result.serverUrl;
    this.isLoggedIn = true;
}

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
    var result = this.invoke("insert", sObjectsParams, header);
    GriffinCommon.log(result.toString(), true);
    return result;
};

Griffin.SupportedCRMs.Salesforce._getHeader = function(){
    var hdr = new SOAPClientParameters();
    var sessionHeader = new SOAPClientParameters();
    sessionHeader.add("sessionId", this.sessionId);
    hdr.add("SessionHeader", sessionHeader);
    return hdr;
};

function SOAPClientParameters()
{
	var _pl = new Array();
	
	this.add = function(name, value) 
	{
	    
	    _pl.push({name: name, value: value});
	};
	
	// Expect value to be primative type or another instance of SOAPClientParameters at this point.
	this._toXml = function(name, value){
	    var xml = "<" + name + ">";
	    if(value instanceof SOAPClientParameters){
	        xml += value.toXml();
	    }
	    else if(value != null){
	        xml += value.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	    }
	    return xml + "</" + name + ">";
	};
	
	this.toXml = function()
	{
		var xml = "";
		for(var pIdx = 0; pIdx < _pl.length; pIdx++)
		{
		    var p = _pl[pIdx].name;
		    var v = _pl[pIdx].value;
			if(typeof(v) != "function")
				xml += this._toXml(p, v);
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
				    "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
				    "<soap:Header>" + headerParameters.toXml() + "</soap:Header>" +
				    "<soap:Body>" +
				    "<" + method + " xmlns=\"" + ns + "\">" +
				    parameters.toXml() +
				    "</" + method + "></soap:Body></soap:Envelope>";
	    GriffinCommon.log("CRMApi.js\r\nUrl: " + url + "\r\n" + sr, true);
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
        GriffinCommon.log("CRMApi.js\r\n" + xmlHttp.responseText, true);
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