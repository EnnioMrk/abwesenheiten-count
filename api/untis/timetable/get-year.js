import { untisController } from '../../../src/controllers/index.js';

export default async function getYearTimetable(req, res) {
    return await untisController.getYearTimetable(req, res);
}
