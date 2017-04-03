import express from 'express';
import validate from 'express-validation';


const router = express.Router(); // eslint-disable-line new-cap
const Admin = require('../services/admin');
const getAPIResponse = require('../helpers/APIResponse');
const { validateApiKey, checkAdmin } = require('../middleware/validation');
const paramValidation = require('../../config/param-validation');

const getAdmins = getAPIResponse(() => Admin.getAdmins(), { skipNotFoundValidation: true });
const getAdminById = getAPIResponse(req => Admin.getAdmin(req.params.id));
const createAdmin = getAPIResponse(req => Admin.createUser(req.body));
const updateAdmin = getAPIResponse(req => Admin.updateAdmin(req.params.id, req.body));
const deleteAdmin = getAPIResponse(req => Admin.deleteUser(req.params.id));

router.get('/', checkAdmin, getAdmins);
router.get('/:id', checkAdmin, getAdminById);
router.post('/', checkAdmin, validate(paramValidation.createAdmin), validateApiKey, createAdmin);
router.patch('/:id', checkAdmin, validate(paramValidation.updateAdmin), validateApiKey, updateAdmin);
router.delete('/:id', checkAdmin, deleteAdmin);

export default router;
