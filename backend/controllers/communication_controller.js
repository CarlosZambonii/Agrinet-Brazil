const Message = require('../models/message');

exports.sendMessage = (req, res) => {
  const { conversationId } = req.params;
  const { from, to, content, type, file } = req.body;
  const msg = Message.sendMessage(parseInt(conversationId), from, to, content, type, file);
  if (global.io) {
    global.io.emit('message', msg);
  }
  res.status(201).json(msg);
};

exports.listMessages = (req, res) => {
  const { conversationId } = req.params;
  const msgs = Message.listMessages(parseInt(conversationId));
  res.json(msgs);
};
