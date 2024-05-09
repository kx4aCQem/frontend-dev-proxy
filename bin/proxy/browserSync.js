/*
Copyright 2021 Adobe
All Rights Reserved.

NOTICE: Adobe permits you to use, modify, and distribute this file in
accordance with the terms of the Adobe license agreement accompanying
it.
*/

const browserSync = require('browser-sync').create();
const CONFIG = require('../lib/proxyConfig');
const dotenv = require('dotenv');
const env = dotenv.config().parsed;

function runBrowserSync ({ port, portProxy }) {
  browserSync.init({
    port,
    proxy: `localhost:${portProxy}${env.AEM_START_PAGE}`,
    files: CONFIG.dir
  });
}

module.exports = runBrowserSync;