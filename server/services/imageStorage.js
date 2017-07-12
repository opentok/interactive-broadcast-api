import R from 'ramda';
import cloudStorage from '@google-cloud/storage';
import moment from 'moment';
import { CronJob } from 'cron';
import config from '../../config/config';
import serviceAccountCredentials from '../../firebaseCredentials.json';
import { db } from './firebase';
import { update } from './event';


// Get access to firebase storage via google cloud storage
const storageBucket = cloudStorage({
  projectId: config.firebaseProjectId,
  credentials: serviceAccountCredentials
}).bucket(config.firebaseStorageBucket);

const storageFile = location => storageBucket.file(location);

const removeImage = fileId => storageFile(`eventImages/${fileId}`).delete();  // Returns a promise

/**
 * Clean up event images from firebase for events that have ended more than
 * n days ago.
 */
(() => {
  // Run the cron job every third day at midnight
  new CronJob('0 0 */3 * *', async () => { // eslint-disable-line no-new
    console.log('Cleaning up event images', moment().format('dddd, MMMM Do YYYY, h:mm:ss a'));

    // Get all of the events with a status of 'closed'
    const snapshot = await db.ref('events').orderByChild('status').equalTo('closed').once('value');
    const closedEvents = R.values(snapshot.val() || {});

    // How long should we wait before cleaning up event images?
    const delayInDays = 3;
    // If the event has been closed for n days or more, we can clean up the images
    const shouldCleanupImages = ({ showEndedAt, startImage, endImage }) =>
      (startImage || endImage) && moment(showEndedAt).isBefore(moment().subtract(delayInDays, 'd'));

    // Get the ids of the images for removal
    const buildCleanupList = (acc, event) => {
      if (shouldCleanupImages(event)) {
        const { startImage, endImage } = event; // eslint-disable-next-line no-confusing-arrow
        const imagesToDelete = R.reduce((list, image) => R.isNil(image) ? list : R.append(image.id, list), [], [startImage, endImage]);
        return R.concat({ eventId: event.id, images: imagesToDelete }, acc);
      }
      return acc;
    };

    const cleanupList = R.reduce(buildCleanupList, [], closedEvents); // [{ eventId: String, images: [String, String]}, ... ]
    const imagesToRemove = R.flatten(R.map(R.prop('images'), cleanupList)); // [imageId]
    const eventsToUpdate = R.map(R.prop('eventId'), cleanupList); // [eventId]

    try {
      // Remove images from firebase storage
      await Promise.all(R.map(removeImage, imagesToRemove));
      // Set image props to null for events in firebase
      await Promise.all(R.map(R.partialRight(update, [{ startImage: null, endImage: null }], eventsToUpdate)));
    } catch (error) {
      // We're going to have errors unless we add a flag to the events, or remove their start/end image properties
      console.log('Failed to cleanup one or more images for closed events', error);
    }
  }, null, true);
})();

/**
 * Remove all images
 * @param {Object} [images]
 * @param {Object} images[key]
 * @param {String} images[key].id
 */
const removeAllImages = async (images = null) => {
  if (!images) {
    return;
  }
  try {
    await Promise.all(R.map(img => removeImage(R.prop('id', img)), R.values(images)));
  } catch (error) {
    console.log('Failed to remove all images', error);
  }
};

/**
 * If images for an event have been updated, we would like to remove the old images from firebase storage
 * @param {Object} EventImages
 * @param {Object} [imagesUpdate]
 */
const updateImages = async (currentImages, imagesUpdate = {}) => {
  // No change, nothing to do
  if (R.isEmpty(imagesUpdate)) {
    return;
  }
  // [Promise]
  const imagesToRemove = R.reduce((acc, type) => {
    if (R.has(type)(currentImages)) {
      const imageId = R.path([type, 'id'], currentImages);
      return R.append(removeImage(imageId), acc);
    }
    return acc;
  }, [], R.keys(imagesUpdate));

  try {
    await Promise.all(imagesToRemove);
  } catch (error) {
    console.log('Failed to cleanup images for event update', error);
  }
};

module.exports = {
  removeAllImages,
  storageFile,
  updateImages,
};
