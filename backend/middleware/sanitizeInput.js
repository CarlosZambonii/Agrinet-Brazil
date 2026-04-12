function sanitizeString(value) {
  if (typeof value !== "string") return value;

  return value
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/</g, "")
    .replace(/>/g, "");
}

function sanitizeFields(fields) {
  return (req, res, next) => {

    if (!req.body) return next();

    for (const field of fields) {
      if (req.body[field]) {
        req.body[field] = sanitizeString(req.body[field]);
      }
    }

    next();
  };
}

module.exports = { sanitizeFields };
