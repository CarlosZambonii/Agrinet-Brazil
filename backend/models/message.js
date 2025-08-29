const messages = [];

function sendMessage(from, to, content, type = 'text') {
  const msg = {
    id: messages.length + 1,
    from,
    to,
    sender: from,
    content,
    type,
    timestamp: new Date().toISOString(),
  };
  messages.push(msg);
  return msg;
}

function listMessages(userId) {
  return messages.filter((m) => m.to === userId || m.from === userId);
}

module.exports = { sendMessage, listMessages };
