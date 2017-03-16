import express from 'express';

const router = express.Router(); // eslint-disable-line new-cap
const Event = require('../services/event');
const getAPIResponse = require('../helpers/APIResponse');
// const { validatEvent } = require('../middleware/validation');

const getEvents = getAPIResponse(req => Event.getEvents(req.query.adminId), { skipNotFoundValidation: true });
const getEventById = getAPIResponse(req => Event.getEvent(req.params.id));
const createEvent = getAPIResponse(req => Event.create(req.body));
const updateEvent = getAPIResponse(req => Event.update(req.params.id, req.body));
const deleteEvent = getAPIResponse(req => Event.deleteEvent(req.params.id));

router.get('/', getEvents);
router.get('/:id', getEventById);
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
