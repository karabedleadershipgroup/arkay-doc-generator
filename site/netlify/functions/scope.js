// Arkay Document Generator — AI scope drafting (voice dictation → scope in Raffie's language)
const ACCESS_CODE = process.env.ACCESS_CODE || "ARKAY2026!";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Access-Code",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HOUSE_STYLE = `You draft HVAC proposal and invoice scopes for Arkay Energy Solutions (Campbell, CA — General & Mechanical Contractor, Certified Title-24 HVAC Testing).

House style rules — follow exactly:
- Every scope line starts with "· " (middle dot + space), imperative voice: "Install...", "Remove and dispose of...", "Run...", "Seal...".
- Use Arkay's standard phrasing: "Install a New [X]-Ton, High-Efficient, Bryant [equipment]", "Model No.[model]", "Seal All New Connections with Mastic, Zip-Ties, and UL Listed Tape to ensure minimal leakage", "Charge the System with the New R-454B Refrigerant with Puron Advanced", "Ensure all work complies with the [City] City Codes & Regulations".
- Repair docs use troubleshoot format: "MALFUNCTIONING [COMPONENT]:" then "· After trouble-shooting the [system], the following was determined:" then findings, then "· The following work was performed:" (invoice) or recommended scope (proposal).
- Repair proposals may include a separate OBSERVATION AND RECOMMENDATION section: plain sentences describing what was found on-site, each recommendation starting "Recommendation: ...", closing with a benefit statement.
- HERS docs: "HERS TESTING & CERTIFICATE PRODUCTION:" with test list (DUCT LEAKAGE, RETURN AIR-FLOW, WATT DRAW, MECHANICAL VENTILATION, REFRIGERANT CHARGE as applicable) and CF2R/CF3R certification list.
- Standard Bryant lineup: 45MUAAQ48XX3 (4-Ton Air Handler), 45MUAAQ60XX3 (5-Ton Air Handler), 37MURAQ48 (4-Ton Heat Pump), 37MURAQ60 (5-Ton Heat Pump).
- Always end install scopes with cleanup: "· Clean up the work area and remove all debris and materials upon completion".
- Never invent prices, model numbers, or measurements the dictation didn't give — leave [BRACKETED PLACEHOLDERS] for anything missing.
- Section headers in ALL CAPS ending with a colon.`;

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if ((event.headers["x-access-code"] || "") !== ACCESS_CODE)
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid access code" }) };

  try {
    const { action, text, docType, jobType } = JSON.parse(event.body || "{}");

    let prompt;
    if (action === "translate") {
      prompt = `Translate this Arkay Energy Solutions ${docType || "proposal"} scope of work into professional Latin American Spanish suitable for a California HVAC client. Keep the "· " bullet format, ALL-CAPS section headers, model numbers, and [BRACKETED PLACEHOLDERS] unchanged. Return ONLY the translated scope, nothing else.\n\n${text}`;
    } else {
      prompt = `A contractor dictated these rough notes from a job site for a ${docType || "proposal"}${jobType ? ` (job type: ${jobType})` : ""}:\n\n"""${text}"""\n\nDraft the scope of work in Arkay house style. If this is a repair proposal and the notes describe on-site findings, return two sections separated by the line "===OBSERVATION===" — first the OBSERVATION AND RECOMMENDATION content, then the SCOPE OF WORK content. Otherwise return only the scope. Return ONLY the document text, no commentary.`;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: HOUSE_STYLE,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Anthropic API error");
    const out = data.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");

    let observation = null, scope = out;
    if (out.includes("===OBSERVATION===")) {
      const parts = out.split("===OBSERVATION===");
      observation = parts[0].replace(/OBSERVATION AND RECOMMENDATION:?/i, "").trim();
      scope = parts[1].replace(/SCOPE OF WORK:?/i, "").trim();
    }
    return { statusCode: 200, headers, body: JSON.stringify({ scope, observation }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
