import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, User } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const Profile = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  const { email, displayName, setDisplayName } = useAuth();
  const [about, setAbout] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const fileInputRef = useRef(null);
  const defaultImage = `${backendUrl}/uploads/default-profile.png`;

  useEffect(() => {
    if (email) {
      fetchUserProfile(email);
    }
  }, [email]);

  const fetchUserProfile = async (userEmail) => {
    try {
      const response = await axios.get(`${backendUrl}/api/users/getUser/${userEmail}`);
      const userData = response.data;

      setDisplayName(userData.displayName || "");
      setAbout(userData.about || "");
      setPhotoURL(
        userData.profilePic
          ? `${backendUrl}${userData.profilePic}`
          : defaultImage
      );

      if (userData.displayName && userData.about) {
        navigate("/chat");
      }
    } catch (error) {
      console.log("User profile not found.");
      setDisplayName("");
      setAbout("");
      setPhotoURL(defaultImage);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error("Display Name is required!");
      return;
    }
    if (!about.trim()) {
      toast.error("About section is required!");
      return;
    }

    try {
      if (!email) {
        console.error("Error: Email is missing");
        return;
      }

      const formData = new FormData();
      formData.append("email", email);
      formData.append("displayName", displayName);
      formData.append("about", about);
      if (selectedFile) {
        formData.append("profilePic", selectedFile);
      }

      const response = await axios.post(`${backendUrl}/api/users/saveUser`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.user) {
        setDisplayName(response.data.user.displayName);
        setPhotoURL(
          response.data.user.profilePic
            ? `${backendUrl}${response.data.user.profilePic}`
            : defaultImage
        );
      }

      toast.success("Profile updated successfully!");
      navigate("/chat");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setSelectedFile(file);
      setPreviewURL(preview);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#1a1a1a]">
      <Card className="w-full max-w-xl shadow-xl bg-white dark:bg-[#2a2a2a] border-gray-200 dark:border-[#3a3a3a]">
        <CardHeader className="text-center space-y-1 pb-6">
          <CardTitle className="text-3xl font-serif text-gray-900 dark:text-white">
            Profile Setup
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Complete your profile and dive into amazing conversations! ✨
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-lg border-gray-200 dark:border-[#3a3a3a] bg-gray-100 dark:bg-[#232323]">
                {previewURL || photoURL ? (
                  <img
                    src={previewURL || photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400 dark:text-gray-600" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all duration-200 transform hover:scale-105">
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                value={email}
                disabled
                className="bg-gray-100 dark:bg-[#232323] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#3a3a3a] cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="displayName"
                className="text-gray-700 dark:text-gray-300">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="bg-white dark:bg-[#232323] text-gray-900 dark:text-white border-gray-200 dark:border-[#3a3a3a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="about"
                className="text-gray-700 dark:text-gray-300">
                About
              </Label>
              <Input
                id="about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Tell us about yourself"
                className="bg-white dark:bg-[#232323] text-gray-900 dark:text-white border-gray-200 dark:border-[#3a3a3a] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all duration-200">
            Save Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
