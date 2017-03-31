import express from 'express';
import validate from 'express-validation';

const router = express.Router(); // eslint-disable-line new-cap
const Event = require('../services/event');
const getAPIResponse = require('../helpers/APIResponse');
const paramValidation = require('../../config/param-validation');
const { validateEvent } = require('../middleware/validation');

const getEvents = getAPIResponse(req => Event.getEvents(req.query.adminId), { skipNotFoundValidation: true });
const getEventById = getAPIResponse(req => Event.getEvent(req.params.id));
const createEvent = getAPIResponse(req => Event.create(req.body));
const updateEvent = getAPIResponse(req => Event.update(req.params.id, req.body));
const deleteEvent = getAPIResponse(req => Event.deleteEvent(req.params.id));
const changeStatus = getAPIResponse(req => Event.changeStatus(req.params.id, req.body));
const startArchive = getAPIResponse(req => Event.startArchive(req.params.id));
const stopArchive = getAPIResponse(req => Event.stopArchive(req.params.id));
const createTokenProducer = getAPIResponse(req => Event.createTokenProducer(req.params.id));
const createTokenFan = getAPIResponse(req => Event.createTokenFan(req.body.adminId, req.body.fanUrl));
const createTokenHostCeleb = userType =>
  getAPIResponse(req => Event.createTokenHostCeleb(req.body.adminId, userType === 'host' ? req.body.hostUrl : req.body.celebrityUrl, userType));

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', validate(paramValidation.event), validateEvent, createEvent);
router.patch('/:id', validate(paramValidation.event), validateEvent, updateEvent);
router.put('/change-status/:id', validate(paramValidation.eventStatus), changeStatus);
router.post('/start-archive/:id', startArchive);
router.post('/stop-archive/:id', stopArchive);
router.post('/create-token-producer/:id', createTokenProducer);
router.post('/create-token-fan', validate(paramValidation.createTokenFan), createTokenFan);
router.post('/create-token-host', validate(paramValidation.createTokenHost), createTokenHostCeleb('host'));
router.post('/create-token-celebrity', validate(paramValidation.createTokenCelebrity), createTokenHostCeleb('celebrity'));
router.delete('/:id', deleteEvent);
export default router;
