"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/config/firebase";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, setDoc, updateDoc, arrayRemove, getDocs, query, where, limit } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logout from "@/helpers/logoutHelp";
import { FaArrowLeft, FaCode, FaUsers, FaClock, FaStar } from "react-icons/fa";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [invites, setInvites] = useState([]);
  const [userStats, setUserStats] = useState({
    totalWorkspaces: 0,
    collaborators: 0,
    activeTime: 0,
    contributions: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setEmail(currentUser.email);
      fetchInvites(currentUser.uid);
      fetchUserStats(currentUser.uid);
    } else {
      router.push("/login");
    }
  }, []);

  const fetchUserStats = async (userId) => {
    try {
      // Fetch workspaces where user is a member
      const workspacesQuery = query(collection(db, "workspaces"));
      const workspacesSnapshot = await getDocs(workspacesQuery);
      const userWorkspaces = [];
      
      for (const workspaceDoc of workspacesSnapshot.docs) {
        const membersRef = collection(db, `workspaces/${workspaceDoc.id}/members`);
        const memberSnapshot = await getDoc(doc(membersRef, userId));
        if (memberSnapshot.exists()) {
          userWorkspaces.push(workspaceDoc.id);
        }
      }

      // Calculate total collaborators across all workspaces
      let totalCollaborators = 0;
      for (const workspaceId of userWorkspaces) {
        const membersRef = collection(db, `workspaces/${workspaceId}/members`);
        const membersSnapshot = await getDocs(membersRef);
        totalCollaborators += membersSnapshot.size;
      }

      // Set user statistics
      setUserStats({
        totalWorkspaces: userWorkspaces.length,
        collaborators: totalCollaborators,
        activeTime: Math.floor(Math.random() * 100), // Placeholder for active time
        contributions: Math.floor(Math.random() * 50) // Placeholder for contributions
      });

      // Set recent activity (placeholder data)
      setRecentActivity([
        { type: 'workspace', action: 'Created new workspace', time: '2 hours ago' },
        { type: 'code', action: 'Updated main component', time: '5 hours ago' },
        { type: 'collaboration', action: 'Joined project Alpha', time: '1 day ago' }
      ]);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast.error("Failed to load user statistics");
    }
  };

  const fetchInvites = async (userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setInvites(userSnap.data().invites || []);
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent successfully. Please check your inbox.");
      toast.success("Password reset link sent to your email!"); // Show success toast
      setIsDialogOpen(false);
    } catch (error) {
      setErrorMessage("Error sending password reset email: " + error.message);
      toast.error("Error sending password reset email "); // Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async (workspaceId) => {
    if (!user) return;

    try {
      const membersRef = doc(db, `workspaces/${workspaceId}/members`, user.uid);
      await setDoc(membersRef, {
        userId: user.uid,
        role: "contributor",
        displayName: user.displayName || "Unknown",
        photoURL: user.photoURL || "/robotic.png",
      });

      // Step 2: Remove the invite from the user's document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        invites: arrayRemove(workspaceId),
      });

      // Update UI
      setInvites(invites.filter((id) => id !== workspaceId));
      toast.success("You have joined the workspace as a contributor!"); // Success toast
    } catch (error) {
      console.error("Error accepting invite:", error);
      toast.error("Error accepting invite!"); // Error toast
    }
  };

  const handleDeleteInvite = async (workspaceId) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        invites: arrayRemove(workspaceId),
      });

      // Update UI
      setInvites(invites.filter((id) => id !== workspaceId));
      toast.success("Invite deleted successfully."); // Success toast
    } catch (error) {
      console.error("Error deleting invite:", error);
      toast.error("Error deleting invite!"); // Error toast
    }
  };

  const isGoogleUser = user && user.providerData.some((provider) => provider.providerId === "google.com");

  const handleGoBack = () => {
    router.push("/dashboard"); // Redirect to the dashboard
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 md:p-8">
      <ToastContainer position="top-right" theme="dark" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <FaArrowLeft className="text-lg" />
            <span>Back to Dashboard</span>
          </button>
          <Button
            onClick={logout}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/50"
          >
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="bg-gray-800/50 backdrop-blur border-gray-700/50 p-6 col-span-1">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <Avatar className="w-24 h-24 border-4 border-blue-500/30 mb-4">
                <AvatarImage src={auth.currentUser?.photoURL || "/robotic.png"} alt="Profile" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                {user?.displayName || "User"}
              </h1>
              <p className="text-gray-400 mb-4">{user?.email}</p>
              
              {!isGoogleUser && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full border-blue-500/30 hover:border-blue-500/50">
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800/95 backdrop-blur border-gray-700">
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Enter your email to receive a password reset link.
                    </DialogDescription>
                    <Input
                      type="email"
                      placeholder="Your Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-gray-700/50 border-gray-600"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePasswordReset}
                        disabled={isLoading}
                        className={`${isLoading ? "bg-gray-600" : "bg-blue-600"} hover:bg-blue-700`}
                      >
                        {isLoading ? "Sending..." : "Send Link"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </motion.div>
          </Card>

          {/* Stats Grid */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaCode className="text-2xl text-blue-400 mb-2" />
              <h3 className="text-gray-400 text-sm">Workspaces</h3>
              <p className="text-2xl font-bold">{userStats.totalWorkspaces}</p>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaUsers className="text-2xl text-green-400 mb-2" />
              <h3 className="text-gray-400 text-sm">Collaborators</h3>
              <p className="text-2xl font-bold">{userStats.collaborators}</p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaClock className="text-2xl text-purple-400 mb-2" />
              <h3 className="text-gray-400 text-sm">Active Time</h3>
              <p className="text-2xl font-bold">{userStats.activeTime}h</p>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-lg p-4 flex flex-col items-center"
            >
              <FaStar className="text-2xl text-yellow-400 mb-2" />
              <h3 className="text-gray-400 text-sm">Contributions</h3>
              <p className="text-2xl font-bold">{userStats.contributions}</p>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <Card className="col-span-1 md:col-span-2 bg-gray-800/50 backdrop-blur border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-blue-400">{activity.action}</div>
                  </div>
                  <span className="text-sm text-gray-400">{activity.time}</span>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Invitations */}
          <Card className="col-span-1 bg-gray-800/50 backdrop-blur border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {invites.length > 0 ? (
                invites.map((workspaceId, index) => (
                  <motion.div
                    key={workspaceId}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 space-y-2"
                  >
                    <div className="text-sm text-gray-300 break-all">{workspaceId}</div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAcceptInvite(workspaceId)}
                        className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50"
                      >
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDeleteInvite(workspaceId)}
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50"
                      >
                        Decline
                      </Button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-4">No pending invitations</p>
              )}
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
