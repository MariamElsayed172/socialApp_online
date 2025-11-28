"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvent = void 0;
const chat_service_1 = require("./chat.service");
class ChatEvent {
    chatService = new chat_service_1.ChatService();
    constructor() { }
    sayHi = (socket, io) => {
        return socket.on("sayHi", (message, callback) => {
            this.chatService.sayHi({ message, socket, callback, io });
        });
    };
    sendMessage = (socket, io) => {
        return socket.on("sendMessage", (data) => {
            this.chatService.sendMessage({ ...data, socket, io });
        });
    };
    joinRoom = (socket, io) => {
        return socket.on("join_room", (data) => {
            this.chatService.joinRoom({ ...data, socket, io });
        });
    };
    sendGroupMessage = (socket, io) => {
        return socket.on("sendGroupMessage", (data) => {
            this.chatService.sendGroupMessage({ ...data, socket, io });
        });
    };
}
exports.ChatEvent = ChatEvent;
