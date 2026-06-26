/* ============================================================
   BrightPine Solutions — minimal static + reviews server
   ------------------------------------------------------------
   Dependency-free (Node.js built-ins only). It does two jobs:

     1. Serves the static site (index.html, css, js, images).
     2. Exposes a tiny reviews API backed by a real JSON file:
          GET  /api/reviews  -> the full reviews array
          POST /api/reviews  -> appends one review, returns it

   Reviews are persisted to data/reviews.json so they are shared
   across every visitor. Run with:  node server.js
   Then open:  http://localhost:3000
   ============================================================ */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "reviews.json");
const CUSTOMER_FILE = path.join(DATA_DIR, "customer.json");
const PORT = process.env.PORT || 3000;
const MAX_BODY = 64 * 1024; // 64 KB — reviews are small (name + rating + text)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

// ---- reviews.json helpers ----
function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
  if (!fs.existsSync(CUSTOMER_FILE)) fs.writeFileSync(CUSTOMER_FILE, "[]", "utf8");
}
// Generic JSON-array store helpers, reused for reviews and customers.
function readArray(file) {
  try {
    const arr = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}
function writeArray(file, arr) {
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), "utf8");
}
function readReviews() { return readArray(DATA_FILE); }
function writeReviews(arr) { writeArray(DATA_FILE, arr); }
function readCustomers() { return readArray(CUSTOMER_FILE); }
function writeCustomers(arr) { writeArray(CUSTOMER_FILE, arr); }

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
}

// ---- API ----
// Read and JSON-parse a request body (bounded by MAX_BODY), then invoke cb(data).
// On oversize or invalid JSON it responds with an error and never calls cb.
function readJsonBody(req, res, cb) {
  let size = 0;
  let chunks = "";
  let aborted = false;
  req.on("data", (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      aborted = true;
      sendJson(res, 413, { message: "Request too large." });
      req.destroy();
      return;
    }
    chunks += c;
  });
  req.on("end", () => {
    if (aborted) return;
    let data;
    try { data = JSON.parse(chunks || "{}"); }
    catch (e) { return sendJson(res, 400, { message: "Invalid JSON." }); }
    cb(data);
  });
}

function handleGetReviews(res) {
  sendJson(res, 200, readReviews());
}

function handlePostReview(req, res) {
  readJsonBody(req, res, (data) => {
    const name = (data.name || "").toString().trim();
    const comment = (data.comment || "").toString().trim();
    const rating = parseInt(data.rating, 10);

    if (!name) return sendJson(res, 400, { message: "Name is required." });
    if (!(rating >= 1 && rating <= 5)) return sendJson(res, 400, { message: "Rating must be 1–5." });
    if (!comment) return sendJson(res, 400, { message: "Review text is required." });

    const review = {
      name: name.slice(0, 60),
      rating: rating,
      comment: comment.slice(0, 600),
      createdUtc: new Date().toISOString()
    };

    try {
      const reviews = readReviews();
      reviews.unshift(review); // newest first
      writeReviews(reviews);
    } catch (e) {
      return sendJson(res, 500, { message: "Could not save the review." });
    }
    sendJson(res, 201, review);
  });
}

function handleGetCustomers(res) {
  sendJson(res, 200, readCustomers());
}

function handlePostCustomer(req, res) {
  readJsonBody(req, res, (data) => {
    const name = (data.name || "").toString().trim();
    const email = (data.email || "").toString().trim();
    const phone = (data.phone || "").toString().trim();
    const service = (data.service || "").toString().trim();
    const message = (data.message || "").toString().trim();

    if (!name) return sendJson(res, 400, { message: "Name is required." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { message: "A valid email is required." });
    if (!message) return sendJson(res, 400, { message: "Project details are required." });

    const customer = {
      name: name.slice(0, 80),
      email: email.slice(0, 120),
      phone: phone.slice(0, 40),
      service: service.slice(0, 80),
      message: message.slice(0, 2000),
      createdUtc: new Date().toISOString()
    };

    try {
      const customers = readCustomers();
      customers.unshift(customer); // newest first
      writeCustomers(customers);
    } catch (e) {
      return sendJson(res, 500, { message: "Could not save your enquiry." });
    }
    sendJson(res, 201, customer);
  });
}

// ---- static files ----
function serveStatic(req, res) {
  // Strip query string, decode, and normalise to a path under ROOT.
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = path.normalize(path.join(ROOT, urlPath));
  // Block path traversal outside ROOT.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 Not Found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
}

// ---- router ----
ensureStore();
const server = http.createServer((req, res) => {
  const pathname = req.url.split("?")[0];

  if (pathname === "/api/reviews") {
    if (req.method === "GET") return handleGetReviews(res);
    if (req.method === "POST") return handlePostReview(req, res);
    res.writeHead(405, { "Allow": "GET, POST" });
    return res.end();
  }

  if (pathname === "/api/customers") {
    if (req.method === "GET") return handleGetCustomers(res);
    if (req.method === "POST") return handlePostCustomer(req, res);
    res.writeHead(405, { "Allow": "GET, POST" });
    return res.end();
  }

  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  console.log("BrightPine site running at http://localhost:" + PORT);
  console.log("Reviews stored in " + DATA_FILE);
});
