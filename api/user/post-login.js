import { userController } from '../../src/controllers/index.js';

export default async function login(req, res) {
    return await userController.login(req, res);
}
