import { getGateway } from "../../helpers/paypal";

export default async function getClientToken(req, res) {
  const gateway = getGateway();

  try {
    const response = await gateway.clientToken.generate({});

    // Ensure we're returning the token in the expected format
    res.json({
      success: true,
      clientToken: response.clientToken,
    });
  } catch (err) {
    console.error("❌ Error generating client token:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
