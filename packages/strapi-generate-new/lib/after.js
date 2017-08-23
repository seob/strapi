'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const { exec } = require('child_process');

// Public node modules.
const _ = require('lodash');
const fs = require('fs-extra');
const npm = require('enpeem');

// Logger.
const logger = require('strapi-utils').logger;

/**
 * Runs after this generator has finished
 *
 * @param {Object} scope
 * @param {Function} cb
 */

module.exports = (scope, cb) => {
  const packageJSON = require(path.resolve(scope.rootPath, 'package.json'));
  const strapiRootPath = path.resolve(scope.strapiRoot, '..');

  process.chdir(scope.rootPath);

  // Copy the default files.
  fs.copySync(path.resolve(__dirname, '..', 'files'), path.resolve(scope.rootPath));

  const availableDependencies = [];
  const missingDependencies = [];

  // Verify if the dependencies are available into the global
  _.forEach(_.merge(_.get(packageJSON, 'dependencies'), _.get(packageJSON, 'devDependencies')), (value, key) => {
    try {
      fs.accessSync(path.resolve(strapiRootPath, key), fs.constants.R_OK | fs.constants.W_OK);
      availableDependencies.push({
        key,
        global: true
      });
      // fs.symlinkSync(path.resolve(strapiRootPath, key), path.resolve(scope.rootPath, 'node_modules', key), 'dir');
    } catch (e1) {
      try {
        fs.accessSync(path.resolve(scope.strapiRoot, 'node_modules', key), fs.constants.R_OK | fs.constants.W_OK);
        availableDependencies.push({
          key,
          global: false
        });
        // fs.symlinkSync(path.resolve(scope.strapiRoot, 'node_modules', key), path.resolve(scope.rootPath, 'node_modules', key), 'dir');
      } catch (e2) {
        missingDependencies.push(key);
      }
    }
  });

  if (!_.isEmpty(missingDependencies)) {
    logger.info('Installing dependencies...');

    npm.install({
      dependencies: missingDependencies,
      loglevel: 'silent',
      'cache-min': 999999999
    }, err => {
      if (err) {
        console.log();
        logger.warn('You should run `npm install` into your application before starting it.');
        console.log();
        logger.warn('Some dependencies could not be installed:');
        _.forEach(missingDependencies, value => logger.warn('• ' + value));
        console.log();

        return cb();
      }

      availableDependencies.forEach(dependency => {
        if (dependency.global) {
          fs.symlinkSync(path.resolve(strapiRootPath, dependency.key), path.resolve(scope.rootPath, 'node_modules', dependency.key), 'dir');
        } else {
          fs.symlinkSync(path.resolve(scope.strapiRoot, 'node_modules', dependency.key), path.resolve(scope.rootPath, 'node_modules', dependency.key), 'dir');
        }
      });

      exec('strapi install settings-manager@alpha', (err, stdout) => {
        logger.info('Installing Settings Manager plugin...');

        if (err) {
          logger.error('An error occured during Settings Manager plugin installation.');
          logger.error(stdout);
        }

        logger.info('Your new application `' + scope.name + '` is ready at `' + scope.rootPath + '`.');

        cb();
      });
    });
  }
};
