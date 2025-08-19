import { userController } from '../../src/controllers/index.js';

export default async function saveQr(req, res) {
    return await userController.saveQrCode(req, res);
}
