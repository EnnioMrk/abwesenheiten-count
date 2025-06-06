import { saveUntisUrl } from "../../helpers/db";
import { loginWithUrl } from "../../helpers/untis";

export default async function saveQr(req, res) {
  const { url } = req.body;
  console.log(`➡️ Saving QR for ${req.session.user.email}`);
  const email = req.session.user.email;

  await saveUntisUrl(email, url);

  let username = await loginWithUrl(email, url);

  req.session.user.untisUsername = username;

  return res.send(username);
}
