import express from 'express';
import validate from 'express-validation';

const router = express.Router(); // eslint-disable-line new-cap
const Event = require('../services/event');
const getAPIResponse = require('../helpers/APIResponse');
const paramValidation = require('../../config/param-validation');
const { validateEvent, checkAdmin, checkFan, checkCelebHost } = require('../middleware/validation');

const getEvents = getAPIResponse(req => Event.getEvents(req.query.adminId), { skipNotFoundValidation: true });
const getEventsByAdmin = getAPIResponse(req => Event.getEventsByAdmin(req.query.adminId), { skipNotFoundValidation: true });
const getMostRecentEvent = getAPIResponse(req => Event.getMostRecentEvent(req.query.adminId), { skipNotFoundValidation: true });
const getEventById = getAPIResponse(req => Event.getEvent(req.params.id));
const createEvent = getAPIResponse(req => Event.create(req.body));
const updateEvent = getAPIResponse(req => Event.update(req.params.id, req.body));
const deleteEvent = getAPIResponse(req => Event.deleteEvent(req.params.id));
const changeStatus = getAPIResponse(req => Event.changeStatus(req.params.id, req.body));
const createTokenProducer = getAPIResponse(req => Event.createTokenProducer(req.params.id));
const createTokenFan = getAPIResponse(req => Event.createTokenFan(req.body.adminId, req.body.fanUrl));
const createTokenHostCeleb = userType =>
  getAPIResponse(req => Event.createTokenHostCeleb(req.body.adminId, userType === 'host' ? req.body.hostUrl : req.body.celebrityUrl, userType));
const createTokenByUserType = getAPIResponse(req => Event.createTokenByUserType(req.params.adminId, req.params.userType));

router.get('/', getEvents);
router.get('/get-events-by-admin', getEventsByAdmin);
router.get('/get-current-admin-event', getMostRecentEvent);
router.get('/:id', getEventById);
router.post('/', checkAdmin, validate(paramValidation.event), validateEvent, createEvent);
router.patch('/:id', checkAdmin, validate(paramValidation.event), validateEvent, updateEvent);
router.put('/change-status/:id', checkAdmin, validate(paramValidation.eventStatus), changeStatus);
router.post('/create-token-producer/:id', checkAdmin, createTokenProducer);
router.post('/create-token-fan', checkFan, validate(paramValidation.createTokenFan), createTokenFan);
router.post('/create-token-host', checkCelebHost, validate(paramValidation.createTokenHost), createTokenHostCeleb('host'));
router.post('/create-token-celebrity', checkCelebHost, validate(paramValidation.createTokenCelebrity), createTokenHostCeleb('celebrity'));
router.post('/create-token/:adminId/:userType', checkCelebHost, createTokenByUserType);

router.delete('/:id', deleteEvent);
export default router;
