import React from "react";
import ChatCont from "./ChatCont";
import { ContactsCont } from "./ContactsCont";
import { useAuth } from "./context/AuthProvider";

export const Chat = () => {
  const { selectedChat } = useAuth();
  return (
    <div className="flex h-[100vh] text-white overflow-hidden">
      <ContactsCont></ContactsCont>
      <ChatCont selectedChat={selectedChat} />

    </div>
  );
};
