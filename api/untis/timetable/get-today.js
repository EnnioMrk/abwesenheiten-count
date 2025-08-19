import { untisController } from '../../../src/controllers/index.js';

export default async function getTodayTimetable(req, res) {
    return await untisController.getTodayTimetable(req, res);
}
