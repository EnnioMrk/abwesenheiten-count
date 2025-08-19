import { userController } from '../../src/controllers/index.js';

export default async function getUserInfo(req, res) {
    return await userController.getUserInfo(req, res);
}
