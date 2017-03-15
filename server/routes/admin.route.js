import express from 'express';

const router = express.Router(); // eslint-disable-line new-cap
const Admin = require('../services/admin');
const getAPIResponse = require('../helpers/APIResponse');
const { validateAdmin } = require('../middleware/validation');

// Get all Users/Admin
router.get('/', getAPIResponse(() => Admin.getAdmins(), { skipNotFoundValidation: true }));

// Get Users/Admin by Id
router.get('/:id', getAPIResponse(req => Admin.getAdmin(req.params.id)));

// Create Users/Admin by Id
router.post('/', validateAdmin, getAPIResponse(req => Admin.createUser(req.body)));

// Edit Users/Admin by Id
router.patch('/:id', validateAdmin, getAPIResponse(req => Admin.updateAdmin(req.params.id, req.body)));

// Delete Users/Admin by Id
router.delete('/:id', getAPIResponse(req => Admin.deleteUser(req.params.id)));

export default router;
