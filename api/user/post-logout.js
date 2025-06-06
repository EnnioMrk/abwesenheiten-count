export default async function logout(req, res) {
  try {
    console.log(`➡️ Logging out ${req.session.user.email}`);
    // Destroy session
    req.session.destroy();

    // Clear cookie
    res.clearCookie("connect.sid");

    // Send success response
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Logout failed");
    res.status(500).json({ success: false, error: "Logout failed" });
  }
}
