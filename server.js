// FindMyDorm HTTPS-ready Node.js backend (Node.js 18+)
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const HTTP_PORT = Number(process.env.HTTP_PORT || 8080);
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ROOT = __dirname;
const MAX_BODY = 20000;
const TLS_KEY = process.env.TLS_KEY_FILE;
const TLS_CERT = process.env.TLS_CERT_FILE;
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const FORCE_HTTPS = process.env.FORCE_HTTPS === "1";
const PRODUCTION = process.env.NODE_ENV === "production";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";

function headers(secure=false) {
  const h = {
    "X-Content-Type-Options":"nosniff", "X-Frame-Options":"DENY",
    "Referrer-Policy":"strict-origin-when-cross-origin",
    "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy":"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; img-src 'self' https://images.unsplash.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com",
    "Cross-Origin-Opener-Policy":"same-origin"
  };
  if (secure) h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  return h;
}
function json(res,status,data,secure=false) {
  const origin = String(res.req?.headers?.origin || "");
  res.writeHead(status,{...headers(secure), ...corsHeaders(origin),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
  res.end(JSON.stringify(data));
}
function isSecure(req) { return !!req.socket.encrypted || (TRUST_PROXY && req.headers["x-forwarded-proto"]==="https"); }
function corsHeaders(origin) {
  if (!origin || !FRONTEND_ORIGIN || origin !== FRONTEND_ORIGIN) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

async function handle(req,res) {
  const secure=isSecure(req), origin=String(req.headers.origin || ""), h={...headers(secure), ...corsHeaders(origin)};
  if (req.method === "OPTIONS" && req.url === "/api/chat") {
    if (!FRONTEND_ORIGIN || origin !== FRONTEND_ORIGIN) {
      res.writeHead(403, h); return res.end();
    }
    res.writeHead(204, h); return res.end();
  }
  if (FORCE_HTTPS && !secure) {
    const host=String(req.headers.host||"");
    if (!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) {res.writeHead(400,h);return res.end("Invalid Host header");}
    res.writeHead(308,{...h,Location:`https://${host}${req.url||"/"}`});return res.end();
  }
  if (req.url==="/api/chat" && req.method==="POST") {
    let body="",tooLarge=false;
    req.on("data",chunk=>{body+=chunk;if(body.length>MAX_BODY){tooLarge=true;json(res,413,{error:"Request too large."},secure);req.destroy();}});
    req.on("end",async()=>{
      if(tooLarge||res.writableEnded)return;
      try {
        const input=JSON.parse(body||"{}");
        const message=typeof input.message==="string"?input.message.trim().slice(0,1200):"";
        if(!message)return json(res,400,{error:"Please enter a message."},secure);
        if(!API_KEY)return json(res,503,{error:"AI is not configured. Set OPENAI_API_KEY on the server."},secure);
        if (!FRONTEND_ORIGIN || origin !== FRONTEND_ORIGIN)
          return json(res,403,{error:"Origin not allowed. Configure FRONTEND_ORIGIN on the backend."},secure);
        const history=Array.isArray(input.history)?input.history.slice(-10).filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").map(m=>({role:m.role,content:m.content.slice(0,2000)})):[];
        const api=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Authorization":`Bearer ${API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,temperature:0.5,max_tokens:600,messages:[{role:"system",content:"You are FindMyDorm's helpful student accommodation assistant for South Africa. Help with budgets, landlord questions and website use. Explain prototype listings and verification claims have not been independently confirmed. Never claim to book rooms, verify landlords or move money. Never ask for passwords, card details or ID numbers. Encourage official sources for important decisions."},...history,{role:"user",content:message}]})});
        const data=await api.json();
        if(!api.ok){console.error("AI provider error status:",api.status);return json(res,502,{error:"The AI provider returned an error. Check server logs and API access."},secure);}
        const reply=data.choices?.[0]?.message?.content?.trim();
        if(!reply)return json(res,502,{error:"The AI returned an empty response."},secure);
        res.writeHead(200,{...h,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify({reply}));
      } catch(e) { console.error("Chat request failed:",e.message);if(!res.headersSent)return json(res,400,{error:"Could not process the chat request."},secure);res.end(); }
    });return;
  }
  if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405,h);return res.end("Method not allowed");}
  let pathname;try{pathname=decodeURIComponent((req.url||"/").split("?")[0]);}catch{res.writeHead(400,h);return res.end("Bad request");}
  const file=path.resolve(ROOT,pathname==="/ "||pathname==="/"?"index.html":pathname.replace(/^\/+/,""));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,h);return res.end("Not found");}
  res.writeHead(200,{...h,"Content-Type":file.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream"});
  if(req.method==="HEAD")return res.end();fs.createReadStream(file).pipe(res);
}
if(TLS_KEY&&TLS_CERT)https.createServer({key:fs.readFileSync(TLS_KEY),cert:fs.readFileSync(TLS_CERT)},handle).listen(PORT,()=>console.log(`FindMyDorm HTTPS listening on port ${PORT}`));
else http.createServer(handle).listen(PORT,()=>{console.log(`FindMyDorm HTTP listening on port ${PORT}`);if(PRODUCTION)console.warn("Production should use HTTPS via TLS_KEY_FILE/TLS_CERT_FILE or a trusted reverse proxy.");});
if(FORCE_HTTPS&&!(TLS_KEY&&TLS_CERT)&&!TRUST_PROXY)http.createServer((req,res)=>{const host=String(req.headers.host||"");if(!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)){res.writeHead(400);return res.end("Invalid Host header");}res.writeHead(308,{Location:`https://${host}${req.url||"/"}`});res.end();}).listen(HTTP_PORT,()=>console.log(`HTTP redirect listening on port ${HTTP_PORT}`));
