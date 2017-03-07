import config from '../../config/config';

const firebase = require('firebase-admin');
const serviceAccountCredentials = require('../../firebaseCredentials.json');

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  databaseURL: config.firebaseDatabaseURL,
  credential: firebase.credential.cert(serviceAccountCredentials)
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
const db = firebase.database();

module.exports = db;
