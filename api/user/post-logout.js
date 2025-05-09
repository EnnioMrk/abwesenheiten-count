export default async function logout(req, res) {
  try {
    process.stdout.write(`➡️ Logging out ${req.session.user.email}`);
    // Destroy session
    req.session.destroy();

    // Clear cookie
    res.clearCookie("connect.sid");

    // Send success response
    res.json({ success: true });
    console.log(" ✅");
  } catch (error) {
    console.error(" ❌");
    res.status(500).json({ success: false, error: "Logout failed" });
  }
}
