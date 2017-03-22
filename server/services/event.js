const Promise = require('bluebird');
const { db } = require('./firebase');
const R = require('ramda');
const { eventProps, timestampCreate, timestampUpdate, eventStatuses } = require('./dbProperties');
const Admin = require('./admin');
const OpenTok = require('./opentok');

const setDefaults = (eventData) => {
  if (!eventData.status) R.set('status', eventStatuses.NON_STARTED, eventData);
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
 * Get a particular Event
 * @param {String} id
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEvent = id => new Promise((resolve, reject) => {
  db.ref('events').child(id).once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(reject);
});

/**
 * Get a particular Event
 * @param {String} adminId
 * @param {String} fanUrl
 * @returns {Promise} <resolve: Event data, reject: Error>
 */
const getEventByPrimaryKey = (adminId, fanUrl) => new Promise((resolve, reject) => {
  const filterByAdmin = (snapshot) => {
    let event;
    R.forEachObjIndexed((s) => {
      if (s.adminId === adminId) event = s;
    }, snapshot.val());
    return event;
  };
  db.ref('events').orderByChild('fanUrl').equalTo(fanUrl).once('value')
    .then(filterByAdmin)
    .then(resolve)
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
    .then(resolve(getEvent(id)))
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
    .then(resolve(getEvent(id)))
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
 * Delete events by AdminId
 * @param {String} id
 */
const deleteEventsByAdminId = id => new Promise((resolve, reject) => {
  const ref = db.ref('events');
  const removeEvents = (snapshot) => {
    const updates = {};
    snapshot.forEach((child) => {
      updates[child.key] = null;
    });
    ref.update(updates);
  };

  ref.orderByChild('adminId').equalTo(id).once('value')
  .then(removeEvents)
  .then(resolve)
  .catch(reject);
});

export {
  getEvents,
  create,
  update,
  deleteEvent,
  getEvent,
  deleteEventsByAdminId,
  getEventByPrimaryKey
};
