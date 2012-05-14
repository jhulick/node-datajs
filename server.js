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
    var request = { 
            requestUri:  "http://services.odata.org" + req.url, 
            method: req.method, 
            headers: { "Accept": "application/atomsvc+xml;q=0.9,application/atom+xml;q=0.7,application/xml;q=0.5" } 
        };
    OData.request( request, 
        function (data) { 
            res.writeHead(res.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        },
        function (error) {
           res.writeHead(500, { 'Content-Type': 'text/plain' });
           res.end(error.message);
        });
}).listen(process.env.PORT ||  process.env.VCAP_APP_PORT);
