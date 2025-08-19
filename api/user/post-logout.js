import { userController } from '../../src/controllers/index.js';

export default async function logout(req, res) {
    return await userController.logout(req, res);
}
