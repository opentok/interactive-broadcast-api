const { db, admin } = require('./firebase');
const R = require('ramda');
const { adminProps, userProps, timestampCreate, timestampUpdate } = require('./dbProperties');
const { encrypt } = require('./encrypt.js');
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
const getAdmins = async () => {
  const snapshot = await db.ref('admins').once('value');
  return snapshot.val();
};

/**
 * Get a particular Admin from firebase
 * @param {String} uid
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const getAdmin = async (uid) => {
  const snapshot = await db.ref('admins').child(uid).once('value');
  return snapshot.val();
};

/**
 * Create an admin
 * @param {String} uid
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const createAdmin = async (data) => {
  const adminData = buildAdmin(R.merge(timestampCreate, data));
  adminData.otSecret = adminData.otSecret ? encrypt(adminData.otSecret) : '';
  db.ref(`admins/${data.id}`).set(adminData);
  return getAdmin(data.id);
};

/**
 * Create an user in firebase-admin
 * @param {Object} admin data
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const createUser = async (data) => {
  const user = await admin.auth().createUser(buildUser(userProps, data));
  return createAdmin(R.merge({ id: user.uid }, data));
};

/**
 * Update an user in firebase-admin
 * @param {String} uid
 * @param {Object} user <email, displayName>
 * @returns {Promise} <resolve: User data, reject: Error>
 */
const updateUser = async (uid, data) => {
  await admin.auth().updateUser(uid, data);
  return true;
};

/**
 * Update an admin
 * @param {String} uid
 * @param {Object} admin data: <otApiKey, otSecret, superAdmin, httpSupport, displayName, email>
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const updateAdmin = async (uid, data) => {
  if (await getAdmin(uid)) {
    const adminData = buildAdmin(R.merge(timestampUpdate, data));
    if (adminData.otSecret) adminData.otSecret = encrypt(adminData.otSecret);
    db.ref(`admins/${uid}`).update(adminData);
    updateUser(uid, R.pick(['email', 'displayName'], data));
    return await getAdmin(uid);
  }
  return null;
};

/**
 * Delete an admin in the DB
 * @param {String} uid
 */
const deleteAdmin = async (uid) => {
  db.ref(`admins/${uid}`).remove();
  return true;
};

/**
 * Delete an user in firebase-admin
 * @param {String} uid
 */
const deleteUser = async (uid) => {
  await admin.auth().deleteUser(uid);
  await deleteAdmin(uid);
  await Event.deleteEventsByAdminId(uid);
  return true;
};

export {
  getAdmins,
  getAdmin,
  updateAdmin,
  createUser,
  deleteUser
};
