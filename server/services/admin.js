const Promise = require('bluebird');
const { db, admin } = require('./firebase');
const Validator = require('validatorjs');
const R = require('ramda');

const userProps = ['name', 'otApiKey', 'otSecret', 'userName', 'superAdmin', 'httpSupport', 'userId'];
const adminProps = ['displayName', 'email', 'password'];

const buildAdmin = (props, userData) => R.pick(props, userData);

const userValidationRules = props => R.zipObj(props, R.times(() => 'required', props.length));

/**
 * Get the list of admins
 * @returns {Promise} <resolve: Admin List, reject: Error>
 */
const getAdmins = () => new Promise((resolve, reject) => {
  db.ref('admins').once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(error => reject(error));
});

const getAdmin = id => new Promise((resolve, reject) => {
  db.ref('admins').child(id).once('value')
    .then(snapshot => resolve(snapshot.val()))
    .catch(error => reject(error));
});

const createUser = data => new Promise((resolve, reject) => {
  db.ref(`admins/${data.userId}`).set(buildAdmin(userProps, data))
    .catch(error => reject(error));
  db.ref(`admins/${data.userId}`).on('value', snapshot => resolve(snapshot.val()));
});

const createAdmin = data => new Promise((resolve, reject) => {
  const validation = new Validator(data, userValidationRules(adminProps));
  if (validation.fails()) {
    reject(validation.errors);
  }
  admin.auth().createUser(buildAdmin(adminProps, data))
    .then(authUser => createUser(R.merge({ userId: authUser.uid }, data)))
    .then(user => resolve(user))
    .catch(error => reject(error));
});

const editAdmin = (id, data) => new Promise((resolve, reject) => {
  db.ref(`admins/${id}`).update(data)
    .catch(error => reject(error));
  db.ref(`admins/${id}`).on('value', snapshot => resolve(snapshot.val()));
});

const deleteAdmin = id => new Promise((resolve, reject) => {
  db.ref(`admins/${id}`).remove()
    .catch(error => reject(error));
  // this is not triggering --->
  db.ref('admins').on('child_removed', (oldSnapshot) => {
    admin.auth().deleteUser(oldSnapshot.key).then(resolve(true));
  });
});


export {
  getAdmins,
  getAdmin,
  createAdmin,
  editAdmin,
  createUser,
  deleteAdmin
};
