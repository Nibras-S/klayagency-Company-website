import 'dotenv/config';

const prerender = false;
const ALLOWED_SERVICES = /* @__PURE__ */ new Set([
  "web",
  "mobile",
  "cloud",
  "ai",
  "security",
  "consulting",
  "other"
]);
const ALLOWED_BUDGETS = /* @__PURE__ */ new Set([
  "under10k",
  "10k-20k",
  "20k-50k",
  "50k-1L",
  "1L-2L",
  "2L+"
]);
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
const POST = async ({ request, clientAddress }) => {
  const apiUrl = process.env.CRM_API_URL;
  const apiToken = process.env.CRM_API_TOKEN;
  if (!apiUrl || !apiToken) {
    return jsonResponse(500, {
      success: false,
      error_code: "misconfigured",
      message: "Contact endpoint is not configured. Please email contact@n3global.tech."
    });
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, {
      success: false,
      error_code: "invalid_json",
      message: "Invalid request body."
    });
  }
  if (typeof payload.website === "string" && payload.website.trim() !== "") {
    return jsonResponse(201, { success: true, lead_id: "noop" });
  }
  const firstName = String(payload.first_name ?? "").trim();
  const lastName = String(payload.last_name ?? "").trim();
  const email = String(payload.email ?? "").trim();
  const message = String(payload.message ?? "").trim();
  const service = String(payload.service_interest ?? "");
  const budget = String(payload.budget_range ?? "");
  const company = String(payload.company ?? "").trim();
  const ndaRequested = payload.nda_requested === true;
  if (!firstName || !lastName) {
    return jsonResponse(400, {
      success: false,
      error_code: "validation_failed",
      message: "Please enter your full name.",
      field_errors: { first_name: !firstName ? "Required" : void 0, last_name: !lastName ? "Required" : void 0 }
    });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, {
      success: false,
      error_code: "validation_failed",
      message: "Please enter a valid email address.",
      field_errors: { email: "Invalid email" }
    });
  }
  if (!ALLOWED_SERVICES.has(service)) {
    return jsonResponse(400, {
      success: false,
      error_code: "validation_failed",
      message: "Please select a valid service.",
      field_errors: { service_interest: "Invalid value" }
    });
  }
  if (budget && !ALLOWED_BUDGETS.has(budget)) {
    return jsonResponse(400, {
      success: false,
      error_code: "validation_failed",
      message: "Please select a valid budget range.",
      field_errors: { budget_range: "Invalid value" }
    });
  }
  if (!message || message.length < 10) {
    return jsonResponse(400, {
      success: false,
      error_code: "validation_failed",
      message: "Please tell us a bit more about your project (at least 10 characters).",
      field_errors: { message: "Too short" }
    });
  }
  if (message.length > 5e3) {
    return jsonResponse(400, {
      success: false,
      error_code: "validation_failed",
      message: "Message is too long (max 5000 characters).",
      field_errors: { message: "Too long" }
    });
  }
  const referrer = String(payload?.metadata && typeof payload.metadata === "object" ? payload.metadata.referrer ?? "" : "") || null;
  const body = {
    first_name: firstName,
    last_name: lastName,
    email,
    phone: payload.phone ?? null,
    company: company || null,
    service_interest: service,
    budget_range: budget || null,
    message,
    nda_requested: ndaRequested,
    source: "website",
    submitted_at: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: {
      ip: clientAddress ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
      referrer
    }
  };
  try {
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`
      },
      body: JSON.stringify(body)
    });
    let upstreamBody = {};
    try {
      upstreamBody = await upstream.json();
    } catch {
    }
    if (!upstream.ok || upstreamBody.success === false) {
      return jsonResponse(upstream.status >= 400 ? upstream.status : 502, {
        success: false,
        error_code: typeof upstreamBody.error_code === "string" ? upstreamBody.error_code : "upstream_error",
        message: typeof upstreamBody.message === "string" ? upstreamBody.message : "We could not deliver your message right now. Please try again or email contact@n3global.tech."
      });
    }
    return jsonResponse(201, {
      success: true,
      lead_id: typeof upstreamBody.lead_id === "string" ? upstreamBody.lead_id : null,
      message: "Enquiry received. We will get back to you shortly."
    });
  } catch (err) {
    console.error("CRM proxy error:", err);
    return jsonResponse(502, {
      success: false,
      error_code: "upstream_unreachable",
      message: "We could not reach our CRM right now. Please try again or email contact@n3global.tech."
    });
  }
};
const GET = () => jsonResponse(405, {
  success: false,
  error_code: "method_not_allowed",
  message: "Use POST."
});

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
