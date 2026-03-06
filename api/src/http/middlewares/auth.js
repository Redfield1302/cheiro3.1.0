const jwt = require("jsonwebtoken");

function extractBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
}

function auth(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function authDelivery(req, res, next) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = verifyToken(token);
    if (decoded?.actorType !== "DELIVERY_PERSON") {
      return res.status(403).json({ error: "Acesso restrito ao modulo de entregas" });
    }
    req.deliveryUser = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { auth, authDelivery };
