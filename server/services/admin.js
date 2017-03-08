const Promise = require('bluebird');
const db = require('./firebase');

/**
 * Get the list of admins
 * @returns {Promise} <resolve: Admin List, reject: Error>
 */
const getAdmins = () =>
  new Promise((resolve, reject) => {
    db.ref('admins').once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(error => reject(error));
  });

module.exports = {
  getAdmins
};
