import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./Firebase.js";
import { setDoc, doc } from "firebase/firestore";
import { useTheme } from "./components/theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import {
  LogIn,
  UserPlus,
  Moon,
  Sun,
  ArrowRight,
  Github,
  Linkedin,
  Mail,
  ArrowLeft,
} from "lucide-react";
import axios from "axios";

export default function Auth() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [editData, setEditData] = useState({ displayName: "", about: "" });
  const [previewPic, setPreviewPic] = useState("");
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const provider = new GoogleAuthProvider();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        setPendingUser(user);
        setShowResendModal(true);
        await auth.signOut();
        toast.error("Please verify your email before signing in.");
        return;
      }

      const response = await fetch(`${backendUrl}/api/users/getUser/${user.email}`);
      const userData = await response.json();

      toast.success("Sign-in successful!");

      if (userData && userData.displayName && userData.about) {
        navigate("/chat");
      } else {
        navigate("/profile");
      }
    } catch (error) {
      toast.error(
        (error.code || error.message)
          .replace("Firebase: Error (auth/", "")
          .replace("auth/", "")
          .replace(").", "")
          .replaceAll("-", " ")
          .toUpperCase()
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || password !== confirmPassword) {
      toast.error("Invalid registration details");
      return;
    }
  
    setLoading(true);
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Save user info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: name,
        email: email,
      });
  
      // Send verification email
      await sendEmailVerification(user);
      toast.success("SignUp Successful! Verification email sent. Please verify your email.");
  
      // **Immediately sign the user out**
      await auth.signOut();
  
      // Reset form and force user to verify email first
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setActiveTab("login");
    } catch (error) {
      toast.error(
        (error.code || error.message)
          .replace("Firebase: Error (auth/", "")
          .replace("auth/", "")
          .replace(").", "")
          .replaceAll("-", " ")
          .toUpperCase()
      );
    } finally {
      setLoading(false);
    }
  };
  

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      toast.success("Google Sign-in Successful!");

      const response = await fetch(`${backendUrl}/api/users/getUser/${user.email}`);
      const userData = await response.json();

      if (userData && userData.displayName && userData.about) {
        navigate("/chat");
      } else {
        navigate("/profile");
      }
    } catch (error) {
      toast.error(
        (error.code || error.message)
          .replace("Firebase: Error (auth/", "")
          .replace("auth/", "")
          .replace(").", "")
          .replaceAll("-", " ")
          .toUpperCase()
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Please check your inbox.");
      setIsForgotPassword(false);
    } catch (error) {
      toast.error(
        (error.code || error.message)
          .replace("Firebase: Error (auth/", "")
          .replace("auth/", "")
          .replace(").", "")
          .replaceAll("-", " ")
          .toUpperCase()
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!email) {
      setError("No email provided");
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${backendUrl}/api/users/getUser/${email}`);
      const { displayName, about, profilePic } = data;
      setUserData(data);
      setEditData({ displayName: displayName || "", about: about || "" });
      const imageUrl = profilePic ? `${backendUrl}${profilePic}` : defaultImage;
      setPreviewPic(getImageUrl(imageUrl));
      setIsProfileComplete(Boolean(displayName && about));
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to load user data");
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white"
          : "bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 text-gray-900"
      }`}>
      <nav className="backdrop-blur-md bg-white/20 dark:bg-black/10 py-4 px-6 flex justify-between items-center border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="relative inline-block">
          <motion.h3
            className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 tracking-tight"
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
            G3V Connect
          </motion.h3>
          <motion.div
            className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          />
        </div>
        <Button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="px-4 py-2 rounded-full bg-white/30 dark:bg-white/10 backdrop-blur-lg hover:bg-white/40 dark:hover:bg-white/20 transition-all duration-300"
          variant="ghost">
          {theme === "light" ? (
            <Moon className="text-gray-800" size={20} />
          ) : (
            <Sun className="text-white" size={20} />
          )}
        </Button>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl">
          <div className="flex flex-col md:flex-row rounded-2xl shadow-2xl bg-white/40 dark:bg-black/20 overflow-hidden">
            <div className="hidden md:flex md:w-5/12 flex-col items-center justify-center p-12 backdrop-blur-lg bg-white/50 dark:bg-black/30 border-r border-gray-200 dark:border-white/20">
              <AnimatePresence mode="wait">
                {isForgotPassword ? (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-purple-600 leading-tight">
                      Reset Password
                    </h2>
                    <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
                      Don't worry! We'll help you recover your password
                      securely.
                    </p>
                  </motion.div>
                ) : activeTab === "login" ? (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-blue-600 leading-tight">
                      Welcome Back!
                    </h2>
                    <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
                      Step into a world of seamless connections. Your journey
                      continues here.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-8 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-green-600 leading-tight">
                      Join G3V Connect
                    </h2>
                    <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
                      Create your account and start connecting with amazing
                      people around the world.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-full md:w-7/12 p-8 md:p-12">
              {isForgotPassword ? (
                <div>
                  <div className="mb-8">
                    <Button
                      onClick={() => setIsForgotPassword(false)}
                      variant="ghost"
                      className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
                      <ArrowLeft size={16} className="mr-2" />
                      Back to login
                    </Button>
                    <h2 className="text-2xl font-bold text-foreground">
                      Forgot Password?
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="Email address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 transition-all duration-200 focus:ring-2 focus:ring-purple-500/50"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 relative overflow-hidden group bg-purple-500 hover:bg-purple-600"
                      disabled={loading}>
                      <span className="relative z-10 flex items-center justify-center">
                        {loading ? "Sending reset link..." : "Send reset link"}
                        {!loading && (
                          <motion.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}>
                            <ArrowRight
                              size={16}
                              className="ml-2 group-hover:translate-x-1 transition-transform"
                            />
                          </motion.div>
                        )}
                      </span>
                    </Button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="mb-8 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-foreground">
                      {activeTab === "login"
                        ? "Welcome Back!"
                        : "Create Your Account"}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {activeTab === "login"
                        ? "Great to see you again! Please enter your details"
                        : "Join our community and start connecting"}
                    </p>
                  </div>

                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full">
                    <TabsList className="grid grid-cols-2 mb-6">
                      <TabsTrigger
                        value="login"
                        className="data-[state=active]:bg-blue-500 data-[state=active]:text-primary-foreground transition-all duration-300">
                        <LogIn size={16} className="mr-2" />
                        SignIn
                      </TabsTrigger>
                      <TabsTrigger
                        value="register"
                        className="data-[state=active]:bg-green-500 data-[state=active]:text-primary-foreground transition-all duration-300">
                        <UserPlus size={16} className="mr-2" />
                        SignUp
                      </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, rotateY: 90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        exit={{ opacity: 0, rotateY: -90 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        style={{ perspective: 1000 }}>
                        <TabsContent value="login" className="mt-0">
                          <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                              <Input
                                placeholder="Email address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/50"
                                required
                              />
                            </div>
                            <div className="space-y-2 relative">
                              <div className="relative">
                                <Input
                                  placeholder="Password"
                                  type={showPassword ? "text" : "password"}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="h-11 transition-all duration-200 focus:ring-2 focus:ring-blue-500/50 pr-12" // Note pr-12 here
                                  required
                                />
                                <button
                                  type="button"
                                  className="absolute inset-y-0 right-3 flex items-center"
                                  onClick={() => setShowPassword(!showPassword)}
                                  disabled={loading}>
                                  {showPassword ? (
                                    <FiEyeOff
                                      className="text-gray-500"
                                      size={20}
                                    />
                                  ) : (
                                    <FiEye
                                      className="text-gray-500"
                                      size={20}
                                    />
                                  )}
                                </button>
                              </div>

                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="link"
                                  className="text-xs text-blue-500 hover:text-blue-600 p-0 h-auto font-normal"
                                  onClick={() => setIsForgotPassword(true)}>
                                  Forgot password?
                                </Button>
                              </div>
                            </div>

                            <Button
                              type="submit"
                              className="w-full h-11 relative overflow-hidden group bg-blue-500 hover:bg-blue-600 mb-3"
                              disabled={loading}>
                              <span className="relative z-10 flex items-center justify-center">
                                {loading ? "Signing in..." : "Sign in"}
                                {!loading && (
                                  <motion.div
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}>
                                    <ArrowRight
                                      size={16}
                                      className="ml-2 group-hover:translate-x-1 transition-transform"
                                    />
                                  </motion.div>
                                )}
                              </span>
                            </Button>

                            <div className="relative flex items-center justify-center mb-3">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                              </div>
                              <div className="relative bg-card px-4 text-xs text-muted-foreground">
                                OR CONTINUE WITH
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              className="w-full h-11 flex items-center justify-center gap-2"
                              onClick={handleGoogleSignIn}>
                              <FcGoogle className="h-5 w-5" />
                              Google
                            </Button>
                          </form>
                        </TabsContent>
                        <Transition appear show={showResendModal} as={Fragment}>
                          <Dialog
                            as="div"
                            className="relative z-10"
                            onClose={() => setShowResendModal(false)}>
                            <Transition.Child
                              as={Fragment}
                              enter="ease-out duration-300"
                              enterFrom="opacity-0"
                              enterTo="opacity-100"
                              leave="ease-in duration-200"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0">
                              <div className="fixed inset-0 bg-black bg-opacity-25" />
                            </Transition.Child>

                            <div className="fixed inset-0 overflow-y-auto">
                              <div className="flex min-h-full items-center justify-center p-4 text-center">
                                <Transition.Child
                                  as={Fragment}
                                  enter="ease-out duration-300"
                                  enterFrom="opacity-0 scale-95"
                                  enterTo="opacity-100 scale-100"
                                  leave="ease-in duration-200"
                                  leaveFrom="opacity-100 scale-100"
                                  leaveTo="opacity-0 scale-95">
                                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                      as="h3"
                                      className="text-lg font-medium leading-6 text-gray-900">
                                      Email not verified
                                    </Dialog.Title>
                                    <div className="mt-2">
                                      <p className="text-sm text-gray-500">
                                        Your email address is not verified.
                                        Please verify your email before logging
                                        in.
                                      </p>
                                    </div>

                                    <div className="mt-4 flex justify-end space-x-3">
                                      <button
                                        className="inline-flex justify-center rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-gray-400"
                                        onClick={() =>
                                          setShowResendModal(false)
                                        }>
                                        Cancel
                                      </button>
                                      <button
                                        className="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                        onClick={async () => {
                                          if (pendingUser) {
                                            await sendEmailVerification(
                                              pendingUser
                                            );
                                            toast.success(
                                              "Verification email sent!"
                                            );
                                          }
                                          setShowResendModal(false);
                                        }}>
                                        Resend Verification
                                      </button>
                                    </div>
                                  </Dialog.Panel>
                                </Transition.Child>
                              </div>
                            </div>
                          </Dialog>
                        </Transition>

                        <TabsContent value="register" className="mt-0">
                          <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                              <Input
                                placeholder="Full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-green-500/50"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Input
                                placeholder="Email address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 transition-all duration-200 focus:ring-2 focus:ring-green-500/50"
                                required
                              />
                            </div>
                            <div className="space-y-2 relative">
                              <div className="relative">
                                <Input
                                  placeholder="Password"
                                  type={showPassword ? "text" : "password"}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="h-11 pr-12 transition-all duration-200 focus:ring-2 focus:ring-green-500/50"
                                  required
                                />
                                <button
                                  type="button"
                                  className="absolute inset-y-0 right-3 flex items-center"
                                  onClick={() => setShowPassword(!showPassword)}
                                  disabled={loading}>
                                  {showPassword ? (
                                    <FiEyeOff
                                      className="text-gray-500"
                                      size={20}
                                    />
                                  ) : (
                                    <FiEye
                                      className="text-gray-500"
                                      size={20}
                                    />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="relative mb-2">
                              <Input
                                placeholder="Confirm password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) =>
                                  setConfirmPassword(e.target.value)
                                }
                                className="h-11 pr-12 transition-all duration-200 focus:ring-2 focus:ring-green-500/50"
                                required
                              />

                              <button
                                type="button"
                                className="absolute inset-y-0 right-3 flex items-center"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                disabled={loading}>
                                {showConfirmPassword ? (
                                  <FiEyeOff
                                    className="text-gray-500"
                                    size={20}
                                  />
                                ) : (
                                  <FiEye className="text-gray-500" size={20} />
                                )}
                              </button>
                            </div>

                            <Button
                              type="submit"
                              className="w-full h-11 relative overflow-hidden group bg-green-500 hover:bg-green-600"
                              disabled={loading}>
                              <span className="relative z-10 flex items-center justify-center">
                                {loading
                                  ? "Creating account..."
                                  : "Create account"}
                                {!loading && (
                                  <motion.div
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}>
                                    <ArrowRight
                                      size={16}
                                      className="ml-2 group-hover:translate-x-1 transition-transform"
                                    />
                                  </motion.div>
                                )}
                              </span>
                            </Button>
                          </form>
                        </TabsContent>
                      </motion.div>
                    </AnimatePresence>
                  </Tabs>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="backdrop-blur-md bg-white/20 dark:bg-black/10 text-center py-6 border-t border-gray-200/30 dark:border-gray-700/30">
        <p className="text-lg font-medium text-gray-800 dark:text-white">
          © {new Date().getFullYear()} G3V Connect. All rights reserved.
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-gray-700 dark:text-gray-200">
          <a
            href="mailto:adadasaivenkat0109@gmail.com"
            className="flex items-center gap-2 hover:text-blue-500 transition-colors cursor-pointer">
            <Mail size={20} />
            <span>Contact</span>
          </a>
          <a
            href="https://github.com/adadasaivenkat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-500 transition-colors">
            <Github size={20} />
            <span>GitHub</span>
          </a>
          <a
            href="https://linkedin.com/in/adadasaivenkat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-500 transition-colors">
            <Linkedin size={20} />
            <span>LinkedIn</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
