import { untisController } from '../../../src/controllers/index.js';

export default async function getAbsences(req, res) {
    return await untisController.getAbsences(req, res);
}
