const Conversation = require('../models/conversation');

exports.create = (req, res) => {
  const { title } = req.body;
  const convo = Conversation.create(title);
  res.status(201).json(convo);
};

exports.list = (req, res) => {
  res.json(Conversation.list());
};

exports.rename = (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const convo = Conversation.rename(id, title);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  res.json(convo);
};

exports.remove = (req, res) => {
  const { id } = req.params;
  Conversation.remove(id);
  res.status(204).end();
};

exports.pin = (req, res) => {
  const { id } = req.params;
  const { pinned } = req.body;
  const convo = Conversation.pin(id, pinned);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  res.json(convo);
};
