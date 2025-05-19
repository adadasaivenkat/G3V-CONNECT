import React from "react";
import { Phone, Video } from "lucide-react";

const CallNotification = ({
  callerName,
  callType,
  onAccept,
  onReject,
  callerProfilePic,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-xl max-w-sm w-full flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full overflow-hidden">
            {callerProfilePic ? (
              <img
                src={callerProfilePic}
                alt={callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {callerName[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse">
            {callType === "video" ? (
              <Video className="w-4 h-4 text-blue-500" />
            ) : (
              <Phone className="w-4 h-4 text-blue-500" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {callerName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Incoming {callType === "video" ? "Video" : "Voice"} Call
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors">
            <Phone className="w-4 h-4 text-white transform rotate-135" />
          </button>
          <button
            onClick={onAccept}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 transition-colors">
            <Phone className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;
