#!/usr/bin/env node

const yargs = require('yargs/yargs');
const {hideBin} = require('yargs/helpers');
const path = require("path");
const fs = require("fs");
const findPort = require('./proxy/findPort');
const proxy = require('./proxy/proxy');

//const shell = require('shelljs');
//const browserSync = require('./proxy/browserSync');

yargs(hideBin(process.argv))
.command('proxy', 'proxy only', () => {
    },
    async function (argv) {
      const CONFIG = loadConfigFile(argv.configFile);
      const port = await findPort(argv.proxyPort);
      const dir = convertToAbsolutePath(argv.dir);
      const targetUrl = argv.url;
      await proxy({...CONFIG, port, dir, targetUrl});
    })
.command('live', 'live preview (proxy + browser sync)', () => {
    },
    async function (argv) {
      const CONFIG = loadConfigFile(argv.configFile);
      const port = await findPort(argv.proxyPort);
      const dir = convertToAbsolutePath(argv.dir);
      const targetUrl = argv.url;
      await proxy({...CONFIG, port, dir, targetUrl});
      // wait for proxy to start before finding next port for browser sync
      const portBrowserSync = await findPort(argv.proxyPort);
      const browserSync = require('browser-sync').create();
      browserSync.init({
        portBrowserSync,
        proxy: `localhost:${port}`,
        files: dir
      });
      //browserSync({port: portBrowserSync, portProxy});
    })
.default('configFile', 'proxy.config.js')
.describe('configFile', 'config file with html processing instructions')
.number('proxyPort')
.default('proxyPort', 7001)
.describe('proxyPort', 'preferred proxy port')
.default('dir', 'dist')
.describe('dir', 'directory with local development files')
.describe('url', 'target-URL to web-application that shall be proxied')
.demandCommand(1, 'command required, either live or proxy')
.demandOption('url')
.help()
.usage('$0 <proxy|live> --url <source-url> [--dir <watch-dir>] [--configFile <file>] [--proxyPort <n>]')
.example('$0 live -url http://localhost:4502')
//.demandCommand(1, 'missing command, one of [proxy|live]')
.wrap(130)
.parse();

function loadConfigFile(configFile) {
  const configPath = convertToAbsolutePath(configFile);
  if (!fs.existsSync(configPath)) {
    console.error(`frontend-dev-proxy: Could not find config file: ${configPath}`);
    process.exit(1);
  }
  return require(configPath);
}

function convertToAbsolutePath(f) {
  return path.isAbsolute(f) ? f : path.resolve(process.cwd(), f);
}
