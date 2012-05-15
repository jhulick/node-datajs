var http = require("http"),
    url = require("url"),
    OData = require("./datajs");
    
OData.defaultHttpClient.request = function (request, success, error) {
    /// <summary>Performs a network request.</summary>
    /// <param name="request" type="Object">Request description.</request>
    /// <param name="success" type="Function">Success callback with the response object.</param>
    /// <param name="error" type="Function">Error callback with an error object.</param>
    /// <returns type="Object">Object with an 'abort' method for the operation.</returns>

    var result = {};
    var req = null;
    var done = false;

    result.abort = function () {
        if (done) {
            return;
        }

        done = true;
        if (req) {
            req.abort();
            req = null;
        }

        error({ message: "Request aborted" });
    };


    var name = null;
    var requestUri = request.requestUri;
    var options = url.parse(request.requestUri);
    options["method"] = request.method || "GET"; 
    if (request.user && request.password) {
        options["auth"] = request.user +  ":" + request.password;
    }

    // Set the name/value pairs.
    if (request.headers) {
        var headers = {};
        for (var name in request.headers ) {
            headers[name] = request.headers[name];
        }
        options["headers"] = headers;
    }

    var req = http.request(options, function (res) {
        var statusCode =res.statusCode;
         var response = { 
                requestUri: requestUri, 
                statusCode:  res.statusCode, 
                statusText: res.statusText, 
                headers: res.headers, 
                body: '' };
        res.on('data', function (chunk) {
            response.body += chunk;
        });
        res.on('end', function () {
            if (done || req === null) {
                return;
            }
            done = true;
            req = null;
            if (statusCode >= 200 && statusCode <= 299) {
                success(response);
            } else {
                error({ message: response.body, request: request, response: response });
            }
        });            
    });
    req.on('error', function(e) {
         error({ message: e.message, request: request });
    });
    if (request.body) {
        req.write(request.body);
    }
    req.end();
    return result;

};
    
http.createServer(function (req, res) {
    var host = "http://services.odata.org";
    if ( req.url.substring(0,5) == '/sap/' ) {
        host = "http://gw.esworkplace.sap.com";
    }       
    var headers = {};
    for ( var header in req.headers ) {
        var name = header.toLowerCase();
        if ( name == "authorization" || 
             name == "accept") {
            headers[header] = req.headers[header];
        }
    }
    var request = { 
            requestUri:  host + req.url, 
            method: req.method, 
            headers: headers 
        };
    OData.request( request, 
        function (data,  response) { 
            res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        },
        function (error) {
           res.writeHead(error.response.statusCode, error.response.headers);
           res.end(error.message);
        });
}).listen(process.env.PORT ||  process.env.VCAP_APP_PORT);
