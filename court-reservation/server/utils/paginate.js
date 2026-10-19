const paginate = async (Model, filter, req, options = {}) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  let query = Model.find(filter)
    .sort(options.sort || {})
    .skip((page - 1) * limit)
    .limit(limit);

  if (options.select) query = query.select(options.select);
  (options.populate || []).forEach(([path, fields]) => {
    query = query.populate(path, fields);
  });

  const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
  return { items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
};

// Makes user text safe to use inside a search (regular expression)
const searchRegex = (text) =>
  new RegExp(String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

module.exports = { paginate, searchRegex };
