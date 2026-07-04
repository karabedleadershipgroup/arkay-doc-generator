// Arkay Document Generator — jobs API (Supabase via service role, never exposed client-side)
const SUPA = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_CODE = process.env.ACCESS_CODE || "ARKAY2026!";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Access-Code",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

async function supa(path, opts = {}) {
  const res = await fetch(`${SUPA}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.method === "POST" ? "return=representation" : "return=representation",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if ((event.headers["x-access-code"] || "") !== ACCESS_CODE)
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Invalid access code" }) };

  const params = event.queryStringParameters || {};
  try {
    // GET ?action=next-number → next doc number
    if (event.httpMethod === "GET" && params.action === "next-number") {
      const [maxRow] = await supa("jobs?select=doc_seq&order=doc_seq.desc&limit=1");
      const [minRow] = await supa("settings?key=eq.min_next_seq&select=value");
      const next = Math.max((maxRow?.doc_seq || 0) + 1, parseInt(minRow?.value || "0", 10));
      return { statusCode: 200, headers, body: JSON.stringify({ next_number: String(next) }) };
    }

    // GET ?action=similar&job_type=X → price intelligence
    if (event.httpMethod === "GET" && params.action === "similar") {
      const jt = encodeURIComponent(params.job_type || "");
      const rows = await supa(
        `jobs?job_type=eq.${jt}&amount=not.is.null&select=doc_number,client,property_address,amount,doc_date,doc_type&order=doc_date.desc&limit=25`
      );
      const amounts = rows.map((r) => Number(r.amount)).sort((a, b) => a - b);
      const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : null;
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          count: rows.length, median,
          low: amounts[0] ?? null, high: amounts[amounts.length - 1] ?? null,
          recent: rows.slice(0, 6),
        }),
      };
    }

    // GET ?action=list → job history (dashboard / convert-to-invoice)
    if (event.httpMethod === "GET" && params.action === "list") {
      const rows = await supa(
        "jobs?select=doc_number,doc_seq,doc_type,client,property_address,city,job_type,amount,doc_date,status,converted_from&order=doc_seq.desc&limit=200"
      );
      return { statusCode: 200, headers, body: JSON.stringify({ jobs: rows }) };
    }

    // POST → save a generated document
    if (event.httpMethod === "POST") {
      const b = JSON.parse(event.body || "{}");
      const seq = parseInt(String(b.doc_number).match(/\d+/)[0], 10);
      const [row] = await supa("jobs", {
        method: "POST",
        body: JSON.stringify([{
          doc_number: String(b.doc_number), doc_seq: seq,
          doc_type: b.doc_type, client: b.client || null,
          property_address: b.property_address || null, city: b.city || null,
          job_type: b.job_type || null, amount: b.amount || null,
          doc_date: b.doc_date, scope_text: b.scope_text || null,
          status: b.status || "sent", converted_from: b.converted_from || null,
          language: b.language || "en",
        }]),
      });
      return { statusCode: 200, headers, body: JSON.stringify({ saved: row }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action" }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
