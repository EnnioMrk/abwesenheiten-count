import { untisController } from '../../../src/controllers/index.js';

export default async function getAllLessons(req, res) {
    return await untisController.getAllLessons(req, res);
}
