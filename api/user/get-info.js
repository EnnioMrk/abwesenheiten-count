import { getDb } from "../../helpers/db";

export default async function getUserInfo(req, res) {
  const email = req.session.user.email;

  console.log(`➡️ Getting user info for ${email}`);

  try {
    const query = `
      SELECT email, first_name, last_name, plan, subscription_status
      FROM users 
      WHERE email = $1
    `;
    const result = await getDb().query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        plan: user.plan,
        subscriptionStatus: user.subscription_status,
      },
    });
  } catch (error) {
    console.log("❌ Failed to get user information");
    res.status(500).json({
      success: false,
      error: "Failed to get user information",
    });
  }
}
