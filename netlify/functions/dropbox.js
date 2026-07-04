// Arkay Document Generator — Dropbox auto-save
// Env: DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN
const ACCESS_CODE = process.env.ACCESS_CODE || "ARKAY2026!";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Access-Code",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getAccessToken() {
  const creds = Buffer.from(`${process.env.DROPBOX_APP_KEY}:${process.env.DROPBOX_APP_SECRET}`).toString("base64");
  const res = await fetch("https://api.dropbox.com/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${process.env.DROPBOX_REFRESH_TOKEN}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Dropbox auth failed");
  return data.access_token;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if ((event.headers["x-access-code"] || "") !== ACCESS_CODE)
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid access code" }) };

  try {
    const { filename, fileBase64, docType } = JSON.parse(event.body || "{}");
    const folder = docType === "Invoice" ? "/Automated Invoices" : "/Automated Proposals";
    const token = await getAccessToken();

    const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: `${folder}/${filename}`,
          mode: "add",
          autorename: true,
          mute: true,
        }),
      },
      body: Buffer.from(fileBase64, "base64"),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_summary || "Dropbox upload failed");
    return { statusCode: 200, headers, body: JSON.stringify({ saved: data.path_display }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
