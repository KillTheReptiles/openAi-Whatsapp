const { updateDocument, getDocumentsWhere, createDocument } = require("../database/querys");

exports.chatMemory = async (from, userMessage = "", assistantMessage) => {
  // Verificar si el chat está creado en la base de datos
  const chatMemory = await getDocumentsWhere("historyChats", [{ field: "phoneNumber", operator: "==", value: from }]);
  if (chatMemory.length === 0) {
    // Si no existe, crear el chat con posición 0
    await createDocument("historyChats", {
      phoneNumber: from,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: assistantMessage },
      ],
      positionMessage: 0,
    });
  } else {
    // Si existe, actualizar los mensajes y la posición
    const messages = chatMemory[0].messages;
    const position = chatMemory[0].positionMessage;

    if (messages.length === 6) {
      // Si ya hay 6 mensajes, eliminar los 2 más antiguos y añadir los nuevos
      messages.splice(0, 2);
      messages.push({ role: "user", content: userMessage }, { role: "assistant", content: assistantMessage });
    } else {
      // Si no, simplemente añadir los nuevos mensajes
      messages.push({ role: "user", content: userMessage }, { role: "assistant", content: assistantMessage });
    }

    await updateDocument("historyChats", chatMemory[0].id, { messages, positionMessage: messages.length - 1 });
  }

  return true;
};
