let http = require('http');
let httpProxy = require('http-proxy');
let parse = require('url').parse;
let join = require('path').join;
let fs = require('fs');
let stream = require('stream');
let request = require('request');
let proxy = httpProxy.createServer();
let cheerio = require('cheerio');

const root = '/usr/local/apache-tomcat-8.0.5/webapps/';
const DHIS_SERVER_ADDRESS = 'http://localhost:8080/';

let server = http.createServer(function(request, response){
    let url = parse(request.url);
    let path = join(root, url.pathname);

    if (new RegExp('^((?!\/dhis\/apps).)*$').test(url.pathname)) {
        console.log('Proxy request for: ' + request.url);

        if (!/^\/dhis/.test(request.url)) {
            request.url = '/dhis' + request.url;
        }

        proxy.web(request, response, {
            target: DHIS_SERVER_ADDRESS
        });
    } else {
        console.log('Serve request for: ' + request.url + ' Looking at: ' + path);

        checkForFileError(path)
            .then(handleFiles(request))
            .then(sendFile(response))
            .catch((error) => {
                response.statusCode = error.statusCode;
                response.end(error.statusMessage);
            });
    }
});

function sendFile(response) {
    return function (streamAndStat) {
        let [stream, stat] = streamAndStat;

        return new Promise(function (resolve, reject) {
            if (stat && stat.size) {
                response.setHeader('Content-Length', stat.size);
            }

            stream.pipe(response);
            stream.on('error', function () {
                response.statusCode = 500;
                response.end('Internal Server Error');
                reject('Error while sending data to the response stream');
            });
            stream.on('end', function () {
                resolve('Done');
            });
        });
    };
}

function checkForFileError(path) {
    return new Promise((resolve, reject) => {
        fs.stat(path, function (error, stat) {
            if (error) {
                if ('ENOENT' == error.code) {
                    reject({
                        statusCode: 404,
                        statusMessage: 'Not Found'
                    });
                } else {
                    reject({
                        statusCode: 500,
                        statusMessage: 'Internal Server Error'
                    });
                }
            } else {
                resolve([path, stat]);
            }
        });
    })
}

function handleFiles(request) {
    return function (pathAndStat) {
    let [path, stat] = pathAndStat;

    return new Promise((resolve, reject) => {
        let resultStream;

        if (new RegExp('manifest\.webapp$', 'i').test(path)) {
            console.log('Handle webapp manifest request');

            fs.readFile(path, 'utf8', function (error, content) {
                if (error) {
                    reject('Error reading file: ' + path);
                }

                let webappManifest = JSON.parse(content);

                webappManifest.activities.dhis.href = 'http://localhost:8090/dhis';

                resultStream = new stream.PassThrough();
                resultStream.end(new Buffer(JSON.stringify(webappManifest)));

                resolve([resultStream, stat]);
            });
            return;
        }

        if (new RegExp('index\.html$', 'i').test(path)) {
            console.log('Handle index.html');

            fs.readFile(path, 'utf8', function (error, content) {
                if (error) {
                    reject('Error reading file: ' + path);
                }

                injectData(content, request)
                    .then((content) => {
                        resultStream = new stream.PassThrough();
                        resultStream.end(new Buffer(content));

                        resolve([resultStream , {}]);
                    });
            });
            return;
        }

        //Default behavior
        resultStream = fs.createReadStream(path);
        resolve([resultStream, stat]);
    });
    }
}

function injectData(content, request) {
    var dataToInsert = [];
    let $ = cheerio.load(content);

    $('script[type="dhis/api-data"]').each((index, element) => {
        dataToInsert.push({
            insertIn: $(element),
            dataFrom: $(element).attr('data-url')
        });
    });

    return getData(dataToInsert, request)
        .then((responses) => {
            responses.forEach((replace) => {
                let script = [
                    '(function (apiInjections) {',
                    'apiInjections["' + (replace.insertIn.attr('data-variable') || replace.dataFrom) + '"] = ',
                    JSON.stringify(replace.data),
                    '})(window.apiInjections = window.apiInjections || {});'
                ];


                replace.insertIn.append(script.join(''));
                replace.insertIn.attr('type', 'text/javascript');
            });
            return $.html();
        })
        .catch((errors) => {
            console.error(errors);

            return content;
        });
}

function getData(dataToInsert, request) {
    return Promise.all(dataToInsert.map((data) => {
        console.log('Loading data from: ' + data.dataFrom);
        return getDataFromApi(DHIS_SERVER_ADDRESS + '/dhis' + data.dataFrom, request)
            .then((response) => {
                return {
                    dataFrom: data.dataFrom,
                    insertIn: data.insertIn,
                    data: response.data
                };
            });
    }));
}

function getDataFromApi(url, requestObject) {
    let requestOptions = {
        url: url,
        headers: {
            cookie: requestObject.headers.cookie,
            accepts: 'application/json',
            'accept-encoding': 'gzip, deflate, lzma, sdch'
        }
    };

    return new Promise(function (resolve, reject) {
        request(requestOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                try {
                    resolve({
                        code: response.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    reject({
                        code: response.statusCode,
                        data: undefined,
                        message: 'Unable to parse response text as JSON'
                    });
                }
            } else {
                reject({
                    code: response.statusCode,
                    data: undefined,
                    message: body
                });
            }
        });
    });
}

server.listen(8090);
console.log('Server listening on port 8090');
