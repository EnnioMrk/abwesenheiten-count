import { dashboardController } from '../../src/controllers/index.js';

export default async function getWidgets(req, res) {
    return await dashboardController.getWidgets(req, res);
}
