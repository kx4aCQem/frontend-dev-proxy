/*
Copyright 2020 Adobe
All Rights Reserved.

NOTICE: Adobe permits you to use, modify, and distribute this file in
accordance with the terms of the Adobe license agreement accompanying
it.
*/

const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const connect = require('connect');
const httpProxy = require('http-proxy');

const proxy = async function (CONFIG) {
  const app = connect();
  const prefix = '[frontend-dev-proxy]';
  const log = msg => console.log(`${prefix} ${msg}`);
  const error = msg => console.error(`${prefix} ${msg}`);

  // Create proxy server
  const proxy = httpProxy.createProxyServer({
    target: CONFIG.targetUrl,
    secure: false,
    autoRewrite: true,
    protocolRewrite: 'http',
    preserveHeaderKeyCase: true,
    selfHandleResponse: true,
    headers: {
      Host: CONFIG.targetUrl.replace(/(^\w+:|^)\/\//, ''),
      Referer: CONFIG.targetUrl,
      Origin: CONFIG.targetUrl
    }
  });

  // Modify proxy response
  proxy.on('proxyRes', function (proxyRes, req, res) {
    const requestUrl = req.url;
    const proxyHeaders = proxyRes?.headers || [];
    const isHtmlRequest = proxyHeaders['content-type']?.match(/(text\/html|application\/xhtml+xml)/);
    const isGZippedRequest = proxyHeaders['content-encoding']?.includes('gzip');
    let cookieHeader = proxyHeaders['set-cookie'];

    // Pass-through the status code
    res.statusCode = proxyRes.statusCode;

    // Detect theme artifacts in a html request
    if (isHtmlRequest) {
      const body = [];

      proxyRes.on('data', function (chunk) {
        body.push(chunk);
      });

      proxyRes.on('end', function () {
        const data = Buffer.concat(body);
        const html = isGZippedRequest ? zlib.unzipSync(data).toString() : data.toString();
        //const replacedHtml = html.replace(/"\s*?(http|\/).*?\/(_default|[0-9a-f]{64})\//g, '"/');
        // ToDo: Apply search-replace from the config

        let replacedHtml = html;
        let isHtmlModified = false;
        if (Array.isArray(CONFIG.htmlSearchReplace)) {
          for (const instr of CONFIG.htmlSearchReplace) {
            if ((typeof instr === 'object') && (instr.regex instanceof RegExp)
                && (typeof instr.replace === 'string')
            ) {
              if ((typeof instr.urlStartsWith === 'string') && (!requestUrl.startsWith(instr.urlStartsWith))) {
                // continue with next instruction, if urlStartsWith is defined and not matching
                continue;
              }
              if (replacedHtml.match(instr.regex)) {
                isHtmlModified = true;
                replacedHtml = replacedHtml.replaceAll(instr.regex, instr.replace);
              }
            }
          }
        }

        if (isHtmlModified) {
          try {
            res.setHeader('content-encoding', '');
            res.setHeader('content-type', 'text/html');
            res.removeHeader('content-length');
            res.end(replacedHtml);
            log(`Proxy ${requestUrl} with modified theme artifacts.`);
          } catch (err) {
            error('Something went wrong. Proxy html rewrite error: ', err);
          }
        } else {
          res.end(data.toString('binary'));
          log(`Proxy ${requestUrl} without changes.`);
        }
      });
    } else {
      proxyRes.pipe(res);
    }

    // Remove the `secure` attribute from cookies to support Chrome
    if (cookieHeader) {
      cookieHeader = cookieHeader.map(val => val.replace('Secure;', ''));
    }

    // Set headers to be sent to client
    for (const header in proxyHeaders) {
      // Rewrite URLs
      const replaceUrl = val => val.replace(CONFIG.targetUrl, `http://localhost:${CONFIG.port}`);

      if (Array.isArray(proxyHeaders[header])) {
        res.setHeader(header, proxyHeaders[header].map(replaceUrl));
      } else {
        res.setHeader(header, replaceUrl(proxyHeaders[header]));
      }
    }
  });

  proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    res.end(`${prefix} Something went wrong. Proxy error: `, err);
  });

  app.use(
      function (req, res) {
        // Remove / and query string from request url
        const reqUrl = path.normalize(req.url).slice(1).split('?')[0];
        const filePath = path.resolve(process.cwd(), CONFIG.dir, reqUrl);
        if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
          log(`Proxy ${reqUrl} to a local file: ${filePath}`);
          fs.createReadStream(filePath).pipe(res);
        } else {
          proxy.web(req, res);
        }
      }
  );

  http.createServer(app).listen(CONFIG.port);

  log(`Proxy running on http://localhost:${CONFIG.port}.`);
};

module.exports = proxy;
