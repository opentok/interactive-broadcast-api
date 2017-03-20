const Promise = require('bluebird');
const { db, admin } = require('./firebase');
const R = require('ramda');
const { adminProps, userProps, timestampCreate, timestampUpdate } = require('./dbProperties');
const Event = require('./event');

const setDefaults = (adminData) => {
  const fields = ['hls', 'httpSupport', 'superAdmin'];
  const setDefault = (v, k) => (R.contains(k, fields) ? R.defaultTo(false)(v) : v);
  return R.mapObjIndexed(setDefault, adminData);
};
const buildUser = (props = userProps, data) => R.pick(props, data);
const buildAdmin = data => setDefaults(buildUser(adminProps, data));

/**
 * Get the list of admins
 * @returns {Promise} <resolve: Admin List, reject: Error>
 */
const getAdmins = () => new Promise((resolve, reject) => {
  db.ref('admins').once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(reject);
});

/**
 * Get a particular Admin from firebase
 * @param {String} uid
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const getAdmin = uid => new Promise((resolve, reject) => {
  db.ref('admins').child(uid).once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(reject);
});

/**
 * Create an admin
 * @param {String} uid
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const createAdmin = data => new Promise((resolve, reject) => {
  const adminData = buildAdmin(R.merge(timestampCreate, data));
  db.ref(`admins/${data.id}`).set(adminData)
    .then(resolve(getAdmin(data.id)))
    .catch(reject);
});

/**
 * Create an user in firebase-admin
 * @param {Object} admin data
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const createUser = data => new Promise((resolve, reject) => {
  admin.auth().createUser(buildUser(userProps, data))
    .then(authUser => createAdmin(R.merge({ id: authUser.uid }, data)))
    .then(user => resolve(user))
    .catch(reject);
});

/**
 * Update an user in firebase-admin
 * @param {String} uid
 * @param {Object} user <email, displayName>
 * @returns {Promise} <resolve: User data, reject: Error>
 */
const updateUser = (uid, data) => new Promise((resolve, reject) => {
  admin.auth().updateUser(uid, data)
  .then(resolve(true))
  .catch(reject);
});

/**
 * Update an admin
 * @param {String} uid
 * @param {Object} admin data: <otApiKey, otSecret, superAdmin, httpSupport, displayName, email>
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const updateAdmin = (uid, data) => new Promise((resolve, reject) => {
  const adminData = buildAdmin(R.merge(timestampUpdate, data));
  db.ref(`admins/${uid}`).update(adminData)
    .then(updateUser(R.pick(['email', 'displayName'], data)))
    .then(resolve(getAdmin(uid)))
    .catch(reject);
});

/**
 * Delete an admin in the DB
 * @param {String} uid
 */
const deleteAdmin = uid => new Promise((resolve, reject) => {
  db.ref(`admins/${uid}`).remove()
    .then(resolve)
    .catch(reject);
});

/**
 * Delete an user in firebase-admin
 * @param {String} uid
 */
const deleteUser = uid => new Promise((resolve, reject) => {
  admin.auth().deleteUser(uid)
    .then(() => deleteAdmin(uid))
    .then(() => Event.deleteEventsByAdminId(uid))
    .then(() => resolve(true))
    .catch(reject);
});

export {
  getAdmins,
  getAdmin,
  updateAdmin,
  createUser,
  deleteUser
};
