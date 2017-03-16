const Promise = require('bluebird');
const { db } = require('./firebase');
const R = require('ramda');
const { eventProps, timestampCreate, timestampUpdate } = require('./dbProperties');
const Admin = require('./admin');
const OpenTok = require('./opentok');

const setDefaults = (eventData) => {
  const fields = ['archiveEvent', 'composed'];
  const setDefault = (v, k) => (R.contains(k, fields) ? R.defaultTo(false)(v) : v);
  return R.mapObjIndexed(setDefault, eventData);
};
const buildEvent = (props, eventData) => setDefaults(R.pick(props, eventData));

/**
 * Get the list of admins
 * @returns {Promise} <resolve: Admin List, reject: Error>
 */
const getEvents = (adminId = null) => new Promise((resolve, reject) => {
  db.ref('events').orderByChild('adminId').equalTo(adminId).once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(reject);
});

/**
 * Create an event
 * @param {Object} event
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const saveEvent = data => new Promise((resolve, reject) => {
  const id = db.ref('events').push().key;
  db.ref(`events/${id}`).set(buildEvent(eventProps, R.mergeAll([timestampCreate, { id }, data])))
    .then(resolve)
    .catch(reject);
});


const getSessions = admin =>
  new Promise((resolve, reject) => {
    const createSession = OpenTok.createSession(admin.otApiKey, admin.otSecret, true);
    Promise.all([createSession, createSession])
      .then(sessions => resolve({ sessionId: sessions[0].sessionId, stageSessionId: sessions[1].sessionId }))
      .catch(reject);
  });

/**
 * Save an appointment
 * @param {Object} data
 * @param {Object} data.user
 * @param {String} data.user.name
 * @param {String} data.user.email
 * @param {Object} data.appointment
 */
const create = data =>
  new Promise((resolve, reject) => {
    Admin.getAdmin(data.adminId)
      .then(getSessions)
      .then(sessions => saveEvent(R.merge(data, sessions)))
      .then(resolve)
      .catch(reject);
  });

/**
 * Update an event
 * @param {String} id
 * @param {Object} eventData
 * @returns {Promise} <resolve: Admin data, reject: Error>
 */
const update = (id, data) => new Promise((resolve, reject) => {
  db.ref(`events/${id}`).update(buildEvent(eventProps, R.merge(timestampUpdate, data)))
    .then(resolve(data))
    .catch(reject);
});

/**
 * Delete an event
 * @param {String} id
 */
const deleteEvent = id => new Promise((resolve, reject) => {
  db.ref(`events/${id}`).remove()
    .then(resolve(true))
    .catch(reject);
});

/**
 * Get a particular Event
 * @param {String} id
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEvent = id => new Promise((resolve, reject) => {
  db.ref('events').child(id).once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(reject);
});

export {
  getEvents,
  create,
  update,
  deleteEvent,
  getEvent
};
