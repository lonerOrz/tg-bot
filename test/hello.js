const handleHello = require("../api/hello");

async function testHello() {
  // 构造模拟的 bot 对象
  const fakeBot = {
    sendMessage: async (chatId, message, options) => {
      console.log("sendMessage 被调用");
      console.log("chatId:", chatId);
      console.log("message:", message);
      console.log("options:", options);
      // 模拟异步延迟
      return Promise.resolve();
    },
  };

  // 构造模拟的消息体
  const fakeBody = {
    message: {
      chat: { id: 12345 },
      text: "Hello, bot!",
    },
  };

  // 调用你的 hello 处理函数
  await handleHello(fakeBot, fakeBody);

  console.log("测试完成");
}

testHello().catch(console.error);
