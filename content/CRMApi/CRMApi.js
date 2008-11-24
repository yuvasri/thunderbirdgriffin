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
}

Griffin.Crm.prototype.invoke = function(method, params, callback){
    var asynch = callback && callback != null;
    var retVal = SOAPClient.invoke(this.endpoint, method, params, asynch, callback, this.ns);
    if(!asynch){
        GriffinCommon.log(retVal, true);
    }
    return retVal;
};

/*
Salesforce client
*/

Griffin.SupportedCRMs.Salesforce = new Griffin.Crm("urn:partner.soap.sforce.com");
Griffin.SupportedCRMs.Salesforce.login = function (username, password){
    var params = new SOAPClientParameters();
    params.add("password", password);
    params.add("username", username);
    this.invoke("login", params);
    this.sessionId = result.sessionId;
    this.serverUrl = result.serverUrl;
}
Griffin.SupportedCRMs.Salesforce.insert = function(sobjects){
    this.invoke("insert", sobjects);
};

function SOAPClientParameters()
{
	var _pl = new Array();
	
	this.add = function(name, value) 
	{
		_pl[name] = value; 
		return this; 
	};
	
	this._toXml = function(name, value){
	    var xml = "<" + name + ">";
	    if(typeof(value) == "SOAPClientParameters"){
	        xml += value.toXml();
	    }
	    else{
	        xml += value.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	    }
	    return xml + "</" + name + ">";
	}
	
	this.toXml = function()
	{
		var xml = "";
		for(var p in _pl)
		{
			if(typeof(_pl[p]) == "Array"){
			    for(var i = 0; i < _pl[p].length; i++)
			        xml += this._toXml(p, _pl[p][i]);
			}
			else if(typeof(_pl[p]) != "function")
				xml += this._toXml(p, _pl[p]);
		}
		return xml;	
	};
	
}

var SOAPClient = {
    invoke: function(url, method, parameters, async, callback, ns)
    {
	    // build SOAP request
	    var sr = 
				    "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
				    "<soap:Envelope " +
				    "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " +
				    "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" " +
				    "xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
				    "<soap:Body>" +
				    "<" + method + " xmlns=\"" + ns + "\">" +
				    parameters.toXml() +
				    "</" + method + "></soap:Body></soap:Envelope>";
	    GriffinCommon.log(sr, true);
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
   
   /* Typical responses:
   SFDC Login err: 
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
 <soapenv:Body>
  <soapenv:Fault>
   <faultcode xmlns:ns1="urn:fault.partner.soap.sforce.com">ns1:INVALID_LOGIN</faultcode>
   <faultstring>INVALID_LOGIN: Invalid username, password, security token; or user locked out.</faultstring>
   <detail>
    <sf:fault xsi:type="sf:LoginFault" xmlns:sf="urn:fault.partner.soap.sforce.com">
     <sf:exceptionCode>INVALID_LOGIN</sf:exceptionCode>
     <sf:exceptionMessage>Invalid username, password, security token; or user locked out.</sf:exceptionMessage>
    </sf:fault>
   </detail>
  </soapenv:Fault>
 </soapenv:Body>
</soapenv:Envelope>

   */ 
    parseResult: function(xmlHttp, method, callback){
        GriffinCommon.log(xmlHttp.responseText, true);
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
            else if(currChild.childNodes.length == 1 && currChild.attributes.length == 0 && currChild.firstChild.nodeType == Node.TEXT_NODE){
                obj[currChild.nodeName] = currChild.firstChild.nodeValue;
            }
            else{
                obj[currChild.nodeName] = SOAPClient.DOM2Obj(currChild);
            }
        }
        obj.toString = function(){
            var string = "";
            for(prop in obj){
                string += prop + ": " + obj[prop].toString() + "\r\n";
            }
        }
        return obj;
    }
}