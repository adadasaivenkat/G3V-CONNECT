import Lottie from "lottie-react";
import { motion } from "framer-motion";
import { MessageSquare, Users, Sparkles } from "lucide-react";
import animationData from "@/animations/EmptyAnimation.json";

export const EmptyChatCont = ({ selectedChat }) => {
  return (
    <div
      className={`hidden md:flex flex-1 h-full bg-white dark:bg-gray-900 items-center justify-center transition-all duration-1000 relative overflow-hidden`}>
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}>
        <motion.div
          className="absolute -top-40 -left-40 w-[20rem] h-[20rem] sm:w-[30rem] sm:h-[30rem] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-[20rem] h-[20rem] sm:w-[30rem] sm:h-[30rem] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </motion.div>
      <motion.div
        className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}>
        <div className="w-full flex justify-center mb-8">
          <Lottie
            animationData={animationData}
            loop={true}
            className="w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 filter drop-shadow-lg"
          />
        </div>

        <motion.div
          className="text-center w-full space-y-4 sm:space-y-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}>
          <div className="relative inline-block mx-auto">
            <motion.h3
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 tracking-tight px-4"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundSize: "200% auto",
                fontFamily: "Dancing Script, cursive",
              }}>
              Welcome to G3V Connect
            </motion.h3>
            <motion.div
              className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>

          <motion.p
            className="text-lg sm:text-xl md:text-2xl text-gray-900 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            style={{ fontFamily: "Caveat, cursive" }}>
            Connect, collaborate, and communicate seamlessly.
          </motion.p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 mt-8 sm:mt-10 px-4">
            <motion.div
              className="flex items-center gap-3 text-gray-900 dark:text-gray-300 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}>
              <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md group-hover:shadow-blue-500/20 transition-all duration-300">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <span className="text-sm sm:text-base md:text-lg">
                Real-time Chat
              </span>
            </motion.div>

            <motion.div
              className="flex items-center gap-3 text-gray-900 dark:text-gray-300 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}>
              <div className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md group-hover:shadow-yellow-500/20 transition-all duration-300">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
              </div>
              <span className="text-sm sm:text-base md:text-lg">
                Smart Features
              </span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
