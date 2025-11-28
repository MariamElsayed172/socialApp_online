import { Server } from "socket.io";
import { IAuthSocket } from "../gateway";
import { ChatEvent } from "./chat.events";



export class ChatGateway {
    private chatEvent: ChatEvent = new ChatEvent()
    constructor(){}

    register = (socket: IAuthSocket, io:Server) =>{
        this.chatEvent.sayHi(socket, io)
        this.chatEvent.sendMessage(socket, io)
        this.chatEvent.joinRoom(socket, io)
        this.chatEvent.sendGroupMessage(socket, io)
    }
}