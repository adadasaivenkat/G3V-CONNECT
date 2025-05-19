import React from "react";
import ChatCont from "./ChatCont";
import { ContactsCont } from "./ContactsCont";
import { useAuth } from "./context/AuthProvider";

export const Chat = () => {
  const { selectedChat } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 relative">
      {/* Contacts panel */}
      <div
        className={`absolute md:static top-0 left-0 h-full w-full
          md:w-[35vw] lg:w-[30vw] xl:w-[20vw]
          bg-white dark:bg-gray-800 z-20
          ${
            selectedChat
              ? "translate-x-[-100%] md:translate-x-0"
              : "translate-x-0"
          }`}
        style={{ transition: "none" }}>
        <ContactsCont />
      </div>

      {/* Chat panel */}
      <div
        className={`absolute md:static top-0 right-0 h-full w-full
          md:w-[calc(100vw-35vw)] lg:w-[calc(100vw-30vw)] xl:w-[calc(100vw-20vw)]
          bg-gray-50 dark:bg-gray-900 z-10
          ${
            selectedChat ? "translate-x-0" : "translate-x-full md:translate-x-0"
          }`}
        style={{ transition: "none" }}>
        <ChatCont selectedChat={selectedChat} />
      </div>
    </div>
  );
};
