/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError } from '../lib/firebase';
import { PublicProfile, PrivateInfo, UserRole, OperationType } from '../types';

interface AuthContextType {
  currentUser: User | null;
  publicProfile: PublicProfile | null;
  privateInfo: PrivateInfo | null;
  loading: boolean;
  profileCompleted: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string, avatarColor: string) => Promise<void>;
  logout: () => Promise<void>;
  completeUserProfile: (displayName: string, avatarColor: string) => Promise<void>;
  updateProfileDetails: (displayName: string, avatarColor: string) => Promise<void>;
  writeAuditLog: (action: 'LOGIN' | 'REGISTER' | 'PROFILE_RENAME' | 'ROLE_CHANGE', details: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<PrivateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived user roles
  const isAdmin = currentUser?.email === 'dasarijeavan1234@gmail.com' || publicProfile?.role === 'admin';
  const isModerator = isAdmin || publicProfile?.role === 'moderator';
  const profileCompleted = !!(publicProfile && privateInfo);

  // Fetch or setup profiles on state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      
      if (user) {
        try {
          // Check for public profile
          const publicRef = doc(db, 'users', user.uid, 'public', 'profile');
          const publicSnap = await getDoc(publicRef).catch((error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}/public/profile`);
          });
          
          // Check for private info
          const privateRef = doc(db, 'users', user.uid, 'private', 'info');
          const privateSnap = await getDoc(privateRef).catch((error) => {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}/private/info`);
          });

          if (publicSnap && publicSnap.exists() && privateSnap && privateSnap.exists()) {
            const pubData = publicSnap.data() as PublicProfile;
            const priData = privateSnap.data() as PrivateInfo;
            setPublicProfile(pubData);
            setPrivateInfo(priData);

            // Access granted - update last login and record event
            await updateDoc(privateRef, {
              lastLogin: serverTimestamp(),
              providerId: user.providerData[0]?.providerId || 'password'
            }).catch((error) => {
              handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/private/info`);
            });

            // Write LOGIN audit log
            const logCollection = collection(db, 'logs');
            await addDoc(logCollection, {
              userId: user.uid,
              userEmail: user.email || 'unknown',
              action: 'LOGIN',
              details: `User successfully logged in via ${user.providerData[0]?.providerId || 'password'}`,
              timestamp: serverTimestamp()
            }).catch((error) => {
              handleFirestoreError(error, OperationType.CREATE, 'logs');
            });
          } else {
            // First time or incomplete profile setup
            setPublicProfile(null);
            setPrivateInfo(null);
          }
        } catch (err) {
          console.error("Error setting up user session profiles:", err);
        }
      } else {
        setPublicProfile(null);
        setPrivateInfo(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Write manual Audit Log helper
  const writeAuditLog = async (
    action: 'LOGIN' | 'REGISTER' | 'PROFILE_RENAME' | 'ROLE_CHANGE',
    details: string
  ) => {
    if (!currentUser) return;
    try {
      const logCollection = collection(db, 'logs');
      await addDoc(logCollection, {
        userId: currentUser.uid,
        userEmail: currentUser.email || 'unknown',
        action,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'logs');
    }
  };

  // Google SSO provider Sign In
  const loginWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Let onAuthStateChanged resolve the user profiles
    } catch (error) {
      console.error("Google authentication failed:", error);
      setLoading(false);
      throw error;
    }
  };

  // Email login
  const loginWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Email sign up
  const signUpWithEmail = async (email: string, password: string, displayName: string, avatarColor: string) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Force email verification trigger if email isn't verified
      if (!user.emailVerified) {
        await sendEmailVerification(user).catch(err => console.log("Email verification trigger skipped."));
      }

      // Initialize the database profile nodes synchronously
      const publicRef = doc(db, 'users', user.uid, 'public', 'profile');
      const privateRef = doc(db, 'users', user.uid, 'private', 'info');

      const isDefaultAdmin = email === 'dasarijeavan1234@gmail.com';
      const role: UserRole = isDefaultAdmin ? 'admin' : 'user';

      const publicData: PublicProfile = {
        displayName,
        role,
        avatarColor,
        updatedAt: serverTimestamp()
      };

      const privateData: PrivateInfo = {
        email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        providerId: 'password'
      };

      // Write public profile node
      await setDoc(publicRef, publicData).catch((error) => {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/public/profile`);
      });

      // Write private info node
      await setDoc(privateRef, privateData).catch((error) => {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/private/info`);
      });

      // Set states
      setPublicProfile(publicData);
      setPrivateInfo(privateData);

      // Write REGISTER audit log
      const logCollection = collection(db, 'logs');
      await addDoc(logCollection, {
        userId: user.uid,
        userEmail: email,
        action: 'REGISTER',
        details: `Registered account with email/password (Admin: ${isDefaultAdmin})`,
        timestamp: serverTimestamp()
      }).catch((error) => {
        handleFirestoreError(error, OperationType.CREATE, 'logs');
      });

      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Log out session
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setPublicProfile(null);
      setPrivateInfo(null);
      setCurrentUser(null);
      setLoading(false);
    } catch (error) {
      console.error("Logout failure:", error);
      setLoading(false);
      throw error;
    }
  };

  // Complete profile registration for SSO/Google first login
  const completeUserProfile = async (displayName: string, avatarColor: string) => {
    if (!currentUser) throw new Error("No active user session found");
    try {
      const publicRef = doc(db, 'users', currentUser.uid, 'public', 'profile');
      const privateRef = doc(db, 'users', currentUser.uid, 'private', 'info');

      const isDefaultAdmin = currentUser.email === 'dasarijeavan1234@gmail.com';
      const role: UserRole = isDefaultAdmin ? 'admin' : 'user';

      const publicData: PublicProfile = {
        displayName,
        role,
        avatarColor,
        updatedAt: serverTimestamp()
      };

      const privateData: PrivateInfo = {
        email: currentUser.email || 'sso-account@unresolved.com',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        providerId: 'google.com'
      };

      await setDoc(publicRef, publicData).catch((error) => {
        handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}/public/profile`);
      });

      await setDoc(privateRef, privateData).catch((error) => {
        handleFirestoreError(error, OperationType.CREATE, `users/${currentUser.uid}/private/info`);
      });

      setPublicProfile(publicData);
      setPrivateInfo(privateData);

      // Create REGISTER audit log
      const logCollection = collection(db, 'logs');
      await addDoc(logCollection, {
        userId: currentUser.uid,
        userEmail: currentUser.email || 'unknown',
        action: 'REGISTER',
        details: `Completed SSO registration setup (Admin: ${isDefaultAdmin})`,
        timestamp: serverTimestamp()
      }).catch((error) => {
        handleFirestoreError(error, OperationType.CREATE, 'logs');
      });

      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Update profile fields
  const updateProfileDetails = async (displayName: string, avatarColor: string) => {
    if (!currentUser || !publicProfile) throw new Error("No active session or loaded profile");
    try {
      const publicRef = doc(db, 'users', currentUser.uid, 'public', 'profile');
      
      const updatedProfile: Partial<PublicProfile> = {
        displayName,
        avatarColor,
        updatedAt: serverTimestamp()
      };

      await updateDoc(publicRef, updatedProfile).catch((error) => {
        handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}/public/profile`);
      });

      setPublicProfile(prev => prev ? { ...prev, displayName, avatarColor } : null);

      // Log event
      await writeAuditLog('PROFILE_RENAME', `Updated displayName to [${displayName}] and changed avatar palette.`);

    } catch (error) {
      throw error;
    }
  };

  const value = {
    currentUser,
    publicProfile,
    privateInfo,
    loading,
    profileCompleted,
    isAdmin,
    isModerator,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    logout,
    completeUserProfile,
    updateProfileDetails,
    writeAuditLog
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be styled inside an AuthProvider element');
  }
  return context;
}
