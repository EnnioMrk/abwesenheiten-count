import { getUntisUrl, verifyUserPassword } from "../../helpers/db";
import { loginWithUrl } from "../../helpers/untis";

export default async function login(req, res) {
  const { email, password } = req.body;
  process.stdout.write(`➡️ Logging in ${email}`);
  const user = await verifyUserPassword(email, password);

  if (user) {
    //save user to session
    req.session.user = user;

    let untisUrl = await getUntisUrl(email);
    if (untisUrl) {
      let username = await loginWithUrl(email, untisUrl);
      req.session.user.untisUsername = username;
    }
    console.log(' ✅');
    res.json({
      success: true,
      user,
    });
    console.log(`🚹 ${email} logged in ${untisUrl ? "with" : "without"} untis`);
  } else {
    console.log(' ❌');
    res.status(401).json({
      success: false,
      error: "Invalid email or password",
    });
  }
}
