/**
 * Controllers index - exports all controllers for easy importing
 * @module controllers
 */

import UserController from './UserController.js';
import UntisController from './UntisController.js';
import DashboardController from './DashboardController.js';
import PayPalController from './PayPalController.js';

// Create singleton instances
const userController = new UserController();
const untisController = new UntisController();
const dashboardController = new DashboardController();
const paypalController = new PayPalController();

export {
    userController,
    untisController,
    dashboardController,
    paypalController,
};

export default {
    user: userController,
    untis: untisController,
    dashboard: dashboardController,
    paypal: paypalController,
};
