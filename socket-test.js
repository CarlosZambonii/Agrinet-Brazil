const { io } = require("socket.io-client");
const readline = require("readline");

const socket = io("http://localhost:5000");

const conversationId = "72004755-e800-4c4a-8829-36fbbf39c433";
const userId = "ecbf256f-5c83-430f-ae0a-229fe1c7bf87";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

socket.on("connect", () => {

  console.log("Conectado:", socket.id);

  socket.emit("user_online", userId);
  socket.emit("join_conversation", conversationId);

  rl.on("line", (text) => {

    socket.emit("send_message", {
      conversation_id: conversationId,
      sender_id: userId,
      message: text
    });

  });

});

socket.on("receive_message", (data) => {
  console.log("Mensagem recebida:", data.message);
});
