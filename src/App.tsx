import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, Users, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import useWebSocket from "./hook/useWebSocket";

interface ChatMessage {
  content: string;
  sender: string;
  timestamp: number;
}

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [joinedRoom, setJoinedRoom] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleWebSocketMessage = useCallback((msg: string) => {
    try {
      const parsedMsg = JSON.parse(msg);
      if (parsedMsg.type === "joined" || parsedMsg.type === "leave") {
        setUsers(parsedMsg.payload.users);
        toast(parsedMsg.type === "joined" ? "User Joined" : "User Left", {
          description: `${parsedMsg.payload.username} ${
            parsedMsg.type === "joined" ? "joined" : "left"
          } the room`,
        });
      }
      if (
        parsedMsg.type === "chat" &&
        parsedMsg.payload?.sender &&
        parsedMsg.payload?.content
      ) {
        setMessages((prev) => [
          ...prev,
          {
            content: parsedMsg.payload.content,
            sender: parsedMsg.payload.sender,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      toast.error("Error", {
        description: "Failed to process message",
      });
    }
  }, []);

  const { sendMessage, connectionStatus } = useWebSocket({
    url: import.meta.env.VITE_WS_URL || "ws://localhost:8080",
    onMessage: handleWebSocketMessage,
    reconnectAttempts: 3,
    autoReconnect: true,
  });

  const handleJoinRoom = useCallback(() => {
    if (!roomId || !username) {
      toast.error("Error", {
        description: "Please enter both username and room ID",
      });
      return;
    }

    try {
      sendMessage(
        JSON.stringify({
          type: "join",
          payload: { roomId, username },
        })
      );
      setJoinedRoom(true);
      toast.success("Joined Room", {
        description: `You've joined room ${roomId} as ${username}`,
      });
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Error", {
        description: "Failed to join room",
      });
    }
  }, [roomId, username, sendMessage]);

  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;

    try {
      const messageData = {
        type: "chat",
        payload: { content: message.trim(), sender: username },
      };
      sendMessage(JSON.stringify(messageData));
      setMessages((prev) => [
        ...prev,
        { content: message.trim(), sender: username, timestamp: Date.now() },
      ]);

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error", {
        description: "Failed to send message",
      });
    }
  }, [message, username, sendMessage]);

  const getAvatarFallback = (sender: string): string => {
    if (!sender) return "?";
    return sender.charAt(0).toUpperCase() || "?";
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const renderUserList = () => (
    <div className="space-y-2">
      {users.map((user) => (
        <div key={user} className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-white bg-zinc-600">
              {getAvatarFallback(user)}
            </AvatarFallback>
          </Avatar>
          <span>{user}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="h-screen bg-zinc-900 text-zinc-100 flex flex-col">
      <AnimatePresence>
        {!joinedRoom ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col justify-center items-center p-4 space-y-4 max-w-md mx-auto w-full"
          >
            <h1 className="text-2xl font-bold text-center">Anonymous Chat</h1>
            <Input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-full"
            />
            <Input
              type="text"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 w-full"
            />
            <Button
              onClick={handleJoinRoom}
              className="w-full bg-zinc-700 hover:bg-zinc-600"
              disabled={connectionStatus !== "Connected"}
            >
              Join Room
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex h-full"
          >
            {/* Sidebar for larger screens */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: isSidebarOpen ? 250 : 0 }}
              transition={{ duration: 0.3 }}
              className="hidden md:block bg-zinc-800 overflow-hidden"
            >
              <div className="p-4">
                <h2 className="font-semibold mb-4">Connected Users</h2>
                {renderUserList()}
              </div>
            </motion.div>

            <div className="flex-1 flex flex-col">
              <div className="bg-zinc-800 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setJoinedRoom(false)}
                    className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-600"
                  >
                    <ArrowLeft size={24} />
                  </Button>
                  <div>
                    <h2 className="font-semibold">Room: {roomId}</h2>
                    <p className="text-sm text-zinc-400">User: {username}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Toggle sidebar on larger screens */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="hidden md:flex text-zinc-400 hover:text-zinc-100 hover:bg-zinc-600"
                  >
                    {isSidebarOpen ? <X size={24} /> : <Users size={24} />}
                  </Button>
                  {/* Sheet for smaller screens */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-zinc-400 hover:text-zinc-100 hover:bg-zinc-600"
                      >
                        <Users size={24} />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="left"
                      className="w-[250px] sm:w-[300px] bg-zinc-900 text-white"
                    >
                      <SheetHeader>
                        <SheetTitle className="text-white">
                          Connected Users
                        </SheetTitle>
                      </SheetHeader>
                      {renderUserList()}
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={`${msg.timestamp}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`flex mb-4 ${
                      msg.sender === username ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[70%] ${
                        msg.sender === username
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-white bg-zinc-600">
                          {getAvatarFallback(msg.sender)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`p-2 rounded-lg ${
                          msg.sender === username
                            ? "bg-green-600"
                            : "bg-zinc-700"
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        <p
                          className={`text-xs  mt-1 ${
                            msg.sender === username
                              ? "text-white"
                              : "text-zinc-400"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </ScrollArea>
              <div className="bg-zinc-800 p-4 flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Type a message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 bg-zinc-700 border-zinc-600 text-zinc-100"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-green-600 hover:bg-green-500"
                  disabled={connectionStatus !== "Connected"}
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
