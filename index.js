// config should be imported before importing any other file
import config from './config/config';
import app from './config/express';

const debug = require('debug')('ibs-backend:index');

// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign


// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
if (!module.parent) {
  // listen on port config.port
  app.listen(config.port, () => {
    debug(`server started on port ${config.port} (${config.env})`);
  });
}

export default app;
