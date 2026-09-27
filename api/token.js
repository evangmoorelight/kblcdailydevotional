const crypto = require("crypto");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const userID =
      String(req.query.userID || "").trim();

    if (!userID) {
      return res.status(400).json({
        error: "userID is required"
      });
    }

    const appID =
      Number(process.env.ZEGO_APP_ID);

    const serverSecret =
      process.env.ZEGO_SERVER_SECRET;

    if (!appID || !serverSecret) {
      return res.status(500).json({
        error: "ZEGO environment variables are not configured"
      });
    }

    /*
     * Token generation is kept server-side.
     * The ServerSecret is NEVER sent to the browser.
     */

    const nonce =
      Math.floor(Math.random() * 2147483647);

    const expire =
      Math.floor(Date.now() / 1000) + 3600;

    const payload = JSON.stringify({
      app_id: appID,
      user_id: userID,
      nonce: nonce,
      expire: expire
    });

    const hash =
      crypto
        .createHmac("sha256", serverSecret)
        .update(payload)
        .digest("hex");

    return res.status(200).json({
      appID: appID,
      userID: userID,
      token: hash,
      expire: expire
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Token generation failed"
    });

  }
};
