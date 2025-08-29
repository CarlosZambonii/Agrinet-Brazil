const { test, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Message = require('../models/message');

const dataFile = path.join(__dirname, '../data/messages.json');

before(() => {
  if (fs.existsSync(dataFile)) fs.writeFileSync(dataFile, '[]');
});

test('sendMessage stores and listMessages retrieves', () => {
  const msg = Message.sendMessage(1, 'u1', 'u2', 'hello');
  assert.ok(msg.id);
  const list = Message.listMessages(1);
  assert.deepStrictEqual(list[0].content, 'hello');
});
