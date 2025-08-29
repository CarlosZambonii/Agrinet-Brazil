const Message = require('../models/message');

exports.sendMessage = (req, res) => {
  const { from, to, content, type } = req.body;
  const msg = Message.sendMessage(from, to, content, type);
  if (global.io) {
    global.io.emit('message', msg);
  }
  res.status(201).json(msg);
};

exports.listMessages = (req, res) => {
  const { userId } = req.params;
  const msgs = Message.listMessages(userId);
  res.json(msgs);
};
