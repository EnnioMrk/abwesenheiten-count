import { untisController } from '../../../src/controllers/index.js';

export default async function getUserData(req, res) {
    return await untisController.getUserData(req, res);
}
