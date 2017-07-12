import firebase from 'firebase-admin';
import config from '../../config/config';
import serviceAccountCredentials from '../../firebaseCredentials.json';

// Initialize the app with a service account, granting admin privileges
firebase.initializeApp({
  databaseURL: config.firebaseDatabaseURL,
  credential: firebase.credential.cert(serviceAccountCredentials)
});

const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await firebase.auth().verifyIdToken(idToken);
    return decodedToken.user_id;
  } catch (error) {
    return null;
  }
};

module.exports = {
  db: firebase.database(),
  admin: firebase,
  verifyIdToken
};
