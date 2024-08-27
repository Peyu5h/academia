"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { useUser } from "~/hooks/useUser";
import axios from "axios";
import { AxiosResponse } from "axios";
import ChatInput from "~/components/ChatPage/Attachement/ChatInput";
import Messages from "~/components/ChatPage/Messages";

interface Message {
  id: string;
  sender: { id: string; name: string };
  content: string;
  timestamp: Date;
  files?: any[];
}

export default function ChatsPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  useEffect(() => {
    const newSocket = io(`${process.env.NEXT_PUBLIC_BACKEND_URL}`);
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      if (user?.classId) {
        newSocket.emit("join_room", { room: user.classId, userId: user.id });

        // fetch from backend
        axios
          .get<Message[]>(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/messages/${user.classId}`,
          )
          .then((response: AxiosResponse<Message[]>) => {
            setMessages(response.data); // Set the old messages
          })
          .catch((error) => {
            console.error("Failed to fetch old messages:", error);
          });
      }
    });

    newSocket.on("receive_message", (message: Message) => {
      console.log("Received message:", message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user?.classId, user?.id]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (
      inputMessage.trim() &&
      socket &&
      user?.classId &&
      user?.id &&
      user?.name
    ) {
      const messageData = {
        room: user.classId,
        content: inputMessage,
        sender: { id: user.id, name: user.name },
        files: [],
      };
      console.log("Sending message:", messageData);
      socket.emit("send_message", messageData);
      setInputMessage("");
    }
  };

  if (!user || !user.classId) {
    return <div>Loading or user not found...</div>;
  }

  return (
    <Card className="mx-auto flex h-[83vh] w-full max-w-6xl flex-col justify-between overflow-hidden border-none bg-transparent">
      <CardContent>
        <div
          ref={messagesContainerRef}
          className="scrollbar h-[68vh] overflow-y-auto pr-4"
        >
          <Messages messages={messages} currentUserId={user.id} />
        </div>
      </CardContent>
      <CardFooter className="min-w-4xl flex w-full justify-center">
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          sendMessage={sendMessage}
        />
      </CardFooter>
    </Card>
  );
}
