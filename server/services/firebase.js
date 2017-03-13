import config from '../../config/config';

const firebase = require('firebase-admin');
const serviceAccountCredentials = require('../../firebaseCredentials.json');

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  databaseURL: config.firebaseDatabaseURL,
  credential: firebase.credential.cert(serviceAccountCredentials)
});

module.exports = {
  db: firebase.database(),
  admin: firebase,
};

