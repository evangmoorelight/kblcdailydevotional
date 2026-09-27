const { generateToken04 } = require("@zegocloud/zego_server_assistant/token/nodejs");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const userID = String(req.query.userID || "").trim();

    if (!userID) {
      return res.status(400).json({
        error: "userID is required"
      });
    }

    const appID = Number(process.env.ZEGO_APP_ID);
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    if (!appID || !serverSecret) {
      return res.status(500).json({
        error: "ZEGO environment variables are missing"
      });
    }

    const token = generateToken04(
      appID,
      userID,
      serverSecret,
      3600,
      ""
    );

    return res.status(200).json({
      appID,
      userID,
      token
    });

  } catch (error) {
    console.error("ZEGO token error:", error);

    return res.status(500).json({
      error: "Could not generate ZEGO token"
    });
  }
};
