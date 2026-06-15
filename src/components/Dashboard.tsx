/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldAlert,
  User,
  ShieldCheck,
  LayoutDashboard,
  Users,
  History,
  FileKey,
  LogOut,
  Edit2,
  Check,
  Search,
  Filter,
  RefreshCw,
  Sliders,
  Shield,
  Clock,
  Mail,
  PlusCircle
} from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { PublicProfile, AuditLog, UserRole, OperationType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

// Color map for avatar background visualization mapped to modern refined editorial tones
const METROPOLIS_COLOR_CLASSES: { [key: string]: string } = {
  '#1a1a1a': 'bg-[#1a1a1a] text-white',
  '#4F46E5': 'bg-[#4F46E5] text-white',
  '#0EA5E9': 'bg-[#0EA5E9] text-white',
  '#10B981': 'bg-[#10B981] text-white',
  '#F59E0B': 'bg-[#F59E0B] text-white',
  '#EF4444': 'bg-[#EF4444] text-white',
  '#8B5CF6': 'bg-[#8B5CF6] text-white',
  '#EC4899': 'bg-[#EC4899] text-white',
};

export default function Dashboard() {
  const {
    currentUser,
    publicProfile,
    privateInfo,
    isAdmin,
    isModerator,
    logout,
    updateProfileDetails,
    writeAuditLog
  } = useAuth();

  // Active Panel/Tab control
  const [activeTab, setActiveTab] = useState<'overview' | 'admin' | 'logs' | 'resource'>('overview');

  // Edit profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(publicProfile?.displayName || '');
  const [editColor, setEditColor] = useState(publicProfile?.avatarColor || '#1a1a1a');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Admin section: profiles list states
  const [allProfiles, setAllProfiles] = useState<{ id: string; profile: PublicProfile }[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [adminMsg, setAdminMsg] = useState({ type: 'success' as 'success' | 'err', text: '' });

  // Moderator section: audit logs states
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilter, setLogsFilter] = useState<string>('ALL');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Secure resource states (Interactive message board)
  const [secureNotes, setSecureNotes] = useState<{ author: string; color: string; content: string; dateStr: string }[]>([]);
  const [newNote, setNewNote] = useState('');

  // Fetch all profiles (Calculated Group Query)
  const fetchAllProfiles = async () => {
    if (!isAdmin) return;
    setLoadingProfiles(true);
    setAdminMsg({ type: 'success', text: '' });
    try {
      const profileSnapshot = await getDocs(collectionGroup(db, 'profile')).catch((err) => {
        handleFirestoreError(err, OperationType.LIST, 'users/{userId}/public/profile');
      });
      
      const loaded: { id: string; profile: PublicProfile }[] = [];
      profileSnapshot.forEach((docSnap) => {
        const pathParts = docSnap.ref.path.split('/');
        const userId = pathParts[1] || docSnap.id;
        loaded.push({
          id: userId,
          profile: docSnap.data() as PublicProfile
        });
      });
      setAllProfiles(loaded);
    } catch (err: any) {
      console.error(err);
      setAdminMsg({ type: 'err', text: 'Perm Denied: Cloud Security Rules restricted user listing.' });
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Fetch security audit logs
  const fetchAuditLogs = async () => {
    if (!isModerator) return;
    setLoadingLogs(true);
    try {
      const logsCollection = collection(db, 'logs');
      const q = query(logsCollection, orderBy('timestamp', 'desc'), limit(100));
      const logsSnap = await getDocs(q).catch((err) => {
        handleFirestoreError(err, OperationType.LIST, 'logs');
      });
      
      const loadedLogs: AuditLog[] = [];
      logsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        loadedLogs.push({
          id: docSnap.id,
          userId: data.userId,
          userEmail: data.userEmail,
          action: data.action,
          details: data.details,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : 'Recent'
        });
      });
      setLogs(loadedLogs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch data on tabs toggle
  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAllProfiles();
    } else if (activeTab === 'logs') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Handle local profile save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    if (editDisplayName.trim().length < 2) {
      setProfileError('Display name must be at least 2 characters long.');
      return;
    }
    setProfileSubmitting(true);
    try {
      await updateProfileDetails(editDisplayName.trim(), editColor);
      setProfileSuccess('Profile attributes updated successfully in Firestore.');
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error(err);
      setProfileError(err?.message || 'Failed to sync with security gate. Check role requirements.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Admin action: change user role
  const handleRoleChange = async (targetUid: string, targetName: string, newRole: UserRole) => {
    if (!isAdmin) return;
    setAdminMsg({ type: 'success', text: '' });
    try {
      const userRef = doc(db, 'users', targetUid, 'public', 'profile');
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp()
      }).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}/public/profile`);
      });

      // Write role change event log
      await writeAuditLog(
        'ROLE_CHANGE',
        `Modified privileges of user ${targetName} (${targetUid}) to role [${newRole.toUpperCase()}].`
      );

      setAdminMsg({ type: 'success', text: `Successfully updated ${targetName} to ${newRole.toUpperCase()}.` });
      
      // Update local profiles list
      setAllProfiles((prev) =>
        prev.map((item) =>
          item.id === targetUid
            ? { ...item, profile: { ...item.profile, role: newRole } }
            : item
        )
      );
    } catch (err: any) {
      console.error(err);
      setAdminMsg({ type: 'err', text: `Failed: ${err?.message || 'Permission denied by Cloud Security rules.'}` });
    }
  };

  // Local handler to write a protected workspace message
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    const payload = {
      author: publicProfile?.displayName || 'Anonymous User',
      color: publicProfile?.avatarColor || '#1a1a1a',
      content: newNote.trim(),
      dateStr: new Date().toLocaleTimeString()
    };

    setSecureNotes(prev => [payload, ...prev]);
    setNewNote('');
    
    // Log event in audit history
    writeAuditLog(
      'PROFILE_RENAME',
      `Created a secured workspace post: "${payload.content.slice(0, 30)}..."`
    );
  };

  // Filter profiles
  const filteredProfiles = allProfiles.filter((p) => {
    const term = adminSearch.toLowerCase();
    return (
      p.profile.displayName.toLowerCase().includes(term) ||
      p.profile.role.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  // Filter audit logs
  const filteredLogs = logs.filter((l) => {
    const term = logsSearch.toLowerCase();
    const filterMatch = logsFilter === 'ALL' || l.action === logsFilter;
    const stringMatch =
      l.details.toLowerCase().includes(term) ||
      l.userEmail.toLowerCase().includes(term) ||
      l.action.toLowerCase().includes(term) ||
      l.userId.toLowerCase().includes(term);
    return filterMatch && stringMatch;
  });

  // Derived user statistics
  const adminCount = allProfiles.filter(p => p.profile.role === 'admin').length;
  const modCount = allProfiles.filter(p => p.profile.role === 'moderator').length;
  const normCount = allProfiles.filter(p => p.profile.role === 'user').length;

  return (
    <div id="dashboard_grid_layout" className="min-h-screen bg-[#FDFCFB] text-[#1a1a1a] flex flex-col font-sans selection:bg-[#1a1a1a] selection:text-[#FDFCFB] animate-fade-in">
      
      {/* 1. Header Navigation Bar */}
      <header id="dashboard_top_navbar" className="bg-[#FDFCFB] border-b border-[#1a1a1a]/10 py-5 px-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-[#1a1a1a] flex items-center justify-center text-[#FDFCFB] text-lg font-serif italic select-none">
              F
            </div>
            <div>
              <h1 className="text-xl font-serif italic tracking-tight text-[#1a1a1a]">The Fortress archive</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-mono font-bold uppercase text-[#1a1a1a]/50 tracking-widest">
                  Secure Host Connection Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Display profile indicator */}
            <div className="flex items-center gap-3.5 pl-5 border-l border-[#1a1a1a]/15">
              <div
                style={{ backgroundColor: publicProfile?.avatarColor || '#1a1a1a' }}
                className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[#FDFCFB] font-bold text-xs uppercase"
              >
                {publicProfile?.displayName?.slice(0, 2) || 'U'}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-semibold text-[#1a1a1a] leading-tight">
                  {publicProfile?.displayName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[8px] font-bold uppercase py-0.5 px-2 rounded-none tracking-widest border font-mono ${
                    isAdmin ? 'bg-[#1a1a1a] text-[#FDFCFB] border-transparent' :
                    isModerator ? 'border-[#1a1a1a] text-[#1a1a1a]' :
                    'border-[#1a1a1a]/20 text-[#1a1a1a]/60'
                  }`}>
                    {publicProfile?.role}
                  </span>
                  {currentUser?.emailVerified ? (
                    <span className="text-[8px] font-mono border border-emerald-600/30 text-emerald-800 py-0.5 px-1.5 font-bold uppercase tracking-wider">Verified</span>
                  ) : (
                    <span className="text-[8px] font-mono border border-amber-600/30 text-amber-800 py-0.5 px-1.5 font-bold uppercase tracking-wider">Pending</span>
                  )}
                </div>
              </div>
            </div>

            <button
              id="top_sign_out_btn"
              onClick={logout}
              className="flex items-center gap-1.5 py-2 px-3 border border-[#1a1a1a]/20 text-[9px] font-bold uppercase tracking-widest text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#FDFCFB] hover:border-transparent transition-all cursor-pointer font-mono"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main content block */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Nav */}
        <div id="side_nav_rail" className="lg:col-span-1 space-y-2">
          <p className="text-[9px] font-bold text-[#1a1a1a]/40 uppercase tracking-[0.25em] pl-2 mb-3 font-mono">Operations</p>
          
          <button
            id="nav_overview_btn"
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer font-mono ${
              activeTab === 'overview'
                ? 'bg-[#1a1a1a] text-[#FDFCFB]'
                : 'bg-transparent text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]'
            }`}
          >
            <LayoutDashboard size={14} className="opacity-70" />
            Security Profile
          </button>

          {isAdmin && (
            <button
              id="nav_admin_btn"
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer font-mono ${
                activeTab === 'admin'
                  ? 'bg-[#1a1a1a] text-[#FDFCFB]'
                  : 'bg-transparent text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users size={14} className="opacity-70" />
                Root Terminal
              </span>
              <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 border border-current">
                LVL-3
              </span>
            </button>
          )}

          {isModerator && (
            <button
              id="nav_logs_btn"
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer font-mono ${
                activeTab === 'logs'
                  ? 'bg-[#1a1a1a] text-[#FDFCFB]'
                  : 'bg-transparent text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]'
              }`}
            >
              <span className="flex items-center gap-3">
                <History size={14} className="opacity-70" />
                Auditor Ledger
              </span>
              <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 border border-current">
                LVL-2
              </span>
            </button>
          )}

          <button
            id="nav_resource_btn"
            onClick={() => setActiveTab('resource')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer font-mono ${
              activeTab === 'resource'
                ? 'bg-[#1a1a1a] text-[#FDFCFB]'
                : 'bg-transparent text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]'
            }`}
          >
            <FileKey size={14} className="opacity-70" />
            Sandbox Board
          </button>

          <div className="pt-6">
            <div className="p-5 border border-[#1a1a1a]/10 text-[11px] text-[#1a1a1a]/70 font-mono tracking-wider space-y-3 leading-relaxed">
              <span className="font-bold text-[#1a1a1a] flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
                <Shield size={12} className="opacity-80" /> Access Protocol
              </span>
              <p>
                Session state synchronized via multi-tiered attribute rules compiled into Cloud Firestore targets.
              </p>
            </div>
          </div>
        </div>

        {/* Tab displays panel */}
        <div id="main_dashboard_panel" className="lg:col-span-3">
          
          <AnimatePresence mode="wait">
            
            {/* Overview / My Profile Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="tab-overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
                id="panel_overview"
              >
                {/* Visual Security Banner */}
                <div className="p-8 bg-[#1a1a1a] text-[#FDFCFB] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  {/* Subtle editorial serif letter overlay */}
                  <div className="absolute right-0 bottom-0 select-none pointer-events-none opacity-[0.03] translate-x-12 translate-y-24">
                    <span className="text-[25rem] font-serif italic">H</span>
                  </div>

                  <div className="relative z-10 space-y-2 max-w-xl">
                    <span className="text-[9px] font-mono uppercase bg-[#FDFCFB]/15 text-[#FDFCFB] font-bold px-2 py-0.5 tracking-[0.2em]">
                      CURATED GATEWAY ACTIVE
                    </span>
                    <h3 className="text-3xl font-serif italic mt-3 tracking-tight text-[#FDFCFB]">
                      Welcome, {publicProfile?.displayName}.
                    </h3>
                    <p className="text-xs text-[#FDFCFB]/70 leading-relaxed font-serif italic">
                      "Security is not a wall, but an architecture. Every line of data is a private threshold, guarded strictly by cryptographic assertions."
                    </p>
                  </div>
                  <div className="shrink-0 p-4 border border-[#FDFCFB]/20 font-mono text-[10px] tracking-widest uppercase">
                    <Sliders size={14} className="mb-2 text-[#FDFCFB]" />
                    <span className="opacity-45 block text-[8px] mb-0.5">Assigned Token</span>
                    <span className="font-bold">{publicProfile?.role}</span>
                  </div>
                </div>

                {/* Main Card Info split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Account Metadata coordinates */}
                  <div className="border border-[#1a1a1a]/10 p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1a1a1a]/50 flex items-center gap-2 mb-6 border-b border-[#1a1a1a]/10 pb-2">
                        <User size={12} /> System Identity Identifiers
                      </h4>
                      
                      <div className="space-y-4 text-xs">
                        <div className="flex flex-col py-1.5">
                          <span className="text-[#1a1a1a]/40 font-mono text-[9px] uppercase tracking-widest mb-1">Cryptographic Client UID</span>
                          <span className="font-mono text-[10px] text-[#1a1a1a] select-all font-bold tracking-tight">{currentUser?.uid}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-[#1a1a1a]/5">
                          <span className="text-[#1a1a1a]/40 font-mono text-[9px] uppercase tracking-widest">Gateway Email</span>
                          <span className="text-[#1a1a1a] font-medium flex items-center gap-1.5 font-mono">
                            <Mail size={12} className="opacity-40" />
                            {privateInfo?.email}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-[#1a1a1a]/5">
                          <span className="text-[#1a1a1a]/40 font-mono text-[9px] uppercase tracking-widest">Sign-In Method</span>
                          <span className="text-[#1a1a1a] font-mono text-[10px] font-bold uppercase tracking-widest">
                            {privateInfo?.providerId}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-[#1a1a1a]/5">
                          <span className="text-[#1a1a1a]/40 font-mono text-[9px] uppercase tracking-widest">Created Stamp</span>
                          <span className="text-[#1a1a1a] flex items-center gap-1 font-mono text-[10px]">
                            <Clock size={11} className="opacity-40" />
                            {privateInfo?.createdAt?.toDate ? privateInfo.createdAt.toDate().toLocaleString() : 'Recent'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-[#1a1a1a]/5">
                          <span className="text-[#1a1a1a]/40 font-mono text-[9px] uppercase tracking-widest">Last Authentication</span>
                          <span className="text-[#1a1a1a] flex items-center gap-1 font-mono text-[10px]">
                            <Clock size={11} className="opacity-40" />
                            {privateInfo?.lastLogin?.toDate ? privateInfo.lastLogin.toDate().toLocaleString() : 'Just now'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile properties customizer */}
                  <div className="border border-[#1a1a1a]/10 p-6">
                    <h4 className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1a1a1a]/50 flex items-center gap-2 mb-6 border-b border-[#1a1a1a]/10 pb-2">
                      <Edit2 size={12} /> Sync Profile Attributes
                    </h4>

                    {profileError && (
                      <div className="p-3 mb-4 bg-red-50 text-red-800 text-[11px] border border-red-100 font-mono">
                        <ShieldAlert size={14} className="inline mr-1.5 shrink-0 align-sub" />
                        <span>{profileError}</span>
                      </div>
                    )}

                    {profileSuccess && (
                      <div className="p-3 mb-4 bg-emerald-50 text-emerald-900 text-[11px] border border-emerald-100 font-mono">
                        <Check size={14} className="inline mr-1.5 shrink-0 align-sub text-emerald-600" />
                        <span>{profileSuccess}</span>
                      </div>
                    )}

                    {!isEditingProfile ? (
                      <div className="space-y-5">
                        <div className="p-5 border border-[#1a1a1a]/10 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              style={{ backgroundColor: publicProfile?.avatarColor }}
                              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm tracking-widest uppercase font-mono"
                            >
                              {publicProfile?.displayName?.slice(0, 2)}
                            </div>
                            <div>
                              <div className="text-[9px] font-mono font-bold text-[#1a1a1a]/40 uppercase tracking-widest">System Identifier</div>
                              <div className="text-base font-semibold text-[#1a1a1a]">{publicProfile?.displayName}</div>
                            </div>
                          </div>
                          
                          <button
                            id="edit_settings_btn"
                            onClick={() => {
                              setEditDisplayName(publicProfile?.displayName || '');
                              setEditColor(publicProfile?.avatarColor || '#1a1a1a');
                              setIsEditingProfile(true);
                              setProfileSuccess('');
                              setProfileError('');
                            }}
                            className="p-2 border border-[#1a1a1a]/10 hover:border-[#1a1a1a] hover:bg-[#1a1a1a]/5 text-[#1a1a1a] transition-all cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                        
                        <div className="p-4 bg-[#1a1a1a]/5 border-l-2 border-[#1a1a1a] text-[11px] font-mono text-[#1a1a1a]/85 leading-relaxed">
                          <strong>Escalation Policy:</strong> To explore Admin or Auditor nodes, register with <strong>dasarijeavan1234@gmail.com</strong>, which automatically bootstraps root administrative scopes on login.
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleProfileSave} className="space-y-4">
                        <div className="space-y-1.5 flex flex-col">
                          <label className="block text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#1a1a1a]/40">
                            Identifier Handle
                          </label>
                          <input
                            id="edit_name_input"
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-1.5 text-xs text-[#1a1a1a] focus:outline-none rounded-none"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#1a1a1a]/40">
                            Preferred Accent Color
                          </label>
                          <div className="flex gap-2 flex-wrap">
                            {Object.keys(METROPOLIS_COLOR_CLASSES).map((color) => (
                              <button
                                key={color}
                                id={`edit_color_${color.replace('#', '')}`}
                                type="button"
                                onClick={() => setEditColor(color)}
                                style={{ backgroundColor: color }}
                                className={`h-5.5 w-5.5 rounded-full cursor-pointer transition-transform ${
                                  editColor === color ? 'ring-2 ring-offset-2 ring-[#1a1a1a] scale-110' : 'opacity-80 hover:opacity-100'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-3">
                          <button
                            id="save_profile_btn"
                            type="submit"
                            disabled={profileSubmitting}
                            className="flex-1 py-2 px-3 bg-[#1a1a1a] hover:bg-black text-[#FDFCFB] text-[10px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-50"
                          >
                            {profileSubmitting ? 'Syncing...' : 'Save Keys'}
                          </button>
                          <button
                            id="cancel_profile_btn"
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="py-2 px-3 border border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/5 text-[#1a1a1a] text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* Admin Center Tab */}
            {activeTab === 'admin' && isAdmin && (
              <motion.div
                key="tab-admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
                id="panel_admin"
              >
                {/* Stats Summary Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="border border-[#1a1a1a]/10 p-5 flex items-center justify-between bg-transparent">
                    <div>
                      <p className="text-[9px] font-bold text-[#111111]/45 uppercase tracking-[0.2em] font-mono">Platform Admins</p>
                      <h4 className="text-3xl font-serif italic text-[#1a1a1a] mt-1">{adminCount}</h4>
                    </div>
                    <div className="h-8.5 w-8.5 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 text-[#1a1a1a] flex items-center justify-center font-mono">
                      A
                    </div>
                  </div>

                  <div className="border border-[#1a1a1a]/10 p-5 flex items-center justify-between bg-transparent">
                    <div>
                      <p className="text-[9px] font-bold text-[#111111]/45 uppercase tracking-[0.2em] font-mono">System Auditors</p>
                      <h4 className="text-3xl font-serif italic text-[#1a1a1a] mt-1">{modCount}</h4>
                    </div>
                    <div className="h-8.5 w-8.5 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 text-[#1a1a1a] flex items-center justify-center font-mono">
                      M
                    </div>
                  </div>

                  <div className="border border-[#1a1a1a]/10 p-5 flex items-center justify-between bg-transparent">
                    <div>
                      <p className="text-[9px] font-bold text-[#111111]/45 uppercase tracking-[0.2em] font-mono">Standard Keys</p>
                      <h4 className="text-3xl font-serif italic text-[#1a1a1a] mt-1">{normCount}</h4>
                    </div>
                    <div className="h-8.5 w-8.5 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 text-[#1a1a1a] flex items-center justify-center font-mono">
                      U
                    </div>
                  </div>
                </div>

                {/* Profiles control board */}
                <div className="border border-[#1a1a1a]/10 p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#1a1a1a]/10 pb-4">
                    <div>
                      <h4 className="text-sm font-serif italic text-[#1a1a1a] tracking-tight">
                        Role Compilation Workspace
                      </h4>
                      <p className="text-[11px] text-[#1a1a1a]/60 mt-0.5">
                        Perform role modification. Changes automatically re-compile and synchronize against active Zero-Trust security rules.
                      </p>
                    </div>

                    <button
                      id="refresh_profiles_btn"
                      onClick={fetchAllProfiles}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a] hover:opacity-70 transition-opacity cursor-pointer font-mono"
                    >
                      <RefreshCw size={11} className={loadingProfiles ? 'animate-spin' : ''} />
                      Sync Keys
                    </button>
                  </div>

                  {/* Operational status message banner */}
                  {adminMsg.text && (
                    <div
                      id="admin_status_banner"
                      className={`p-3.5 mb-4 border flex items-start gap-2 font-mono text-[11px] ${
                        adminMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                          : 'bg-red-50 text-red-950 border-red-200'
                      }`}
                    >
                      {adminMsg.type === 'success' ? <Check size={14} className="mt-0.5 text-emerald-600 shrink-0" /> : <ShieldAlert size={14} className="mt-0.5 shrink-0" />}
                      <span>{adminMsg.text}</span>
                    </div>
                  )}

                  {/* Search filter input */}
                  <div className="flex bg-[#1a1a1a]/5 items-center px-3 py-2 border border-[#1a1a1a]/10 mb-6 font-mono max-w-sm">
                    <Search size={13} className="opacity-40 shrink-0" />
                    <input
                      id="admin_search_input"
                      type="text"
                      className="text-xs bg-transparent ml-2 outline-none w-full text-[#1a1a1a] placeholder:opacity-40"
                      placeholder="Filter user handles, roles, or raw hashes..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                    />
                  </div>

                  {/* User table lists */}
                  <div className="overflow-x-auto">
                    {loadingProfiles ? (
                      <div className="text-center py-10 space-y-2">
                        <svg className="animate-spin h-5 w-5 text-[#1a1a1a] mx-auto" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-[10px] font-mono text-[#1a1a1a]/40">Processing collection references...</p>
                      </div>
                    ) : filteredProfiles.length === 0 ? (
                      <div className="text-center py-12 text-xs text-[#1a1a1a]/50 border border-dashed border-[#1a1a1a]/10">
                        No authorized security records matching parameters.
                      </div>
                    ) : (
                      <table className="min-w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1a1a1a]/10 text-[9px] text-[#1a1a1a]/50 uppercase tracking-[0.2em] font-mono leading-loose">
                            <th className="py-2.5 font-bold">Identity Handle</th>
                            <th className="py-2.5 font-bold">Cryptographic UID Reference</th>
                            <th className="py-2.5 font-bold">Active Privilege</th>
                            <th className="py-2.5 font-bold text-right">Alter Privilege Level</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/5 font-mono text-[11px]">
                          {filteredProfiles.map((item) => (
                            <tr key={item.id} className="hover:bg-[#1a1a1a]/5 transition-all">
                              {/* Display handle */}
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    style={{ backgroundColor: item.profile.avatarColor }}
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold shrink-0 uppercase"
                                  >
                                    {item.profile.displayName?.slice(0, 2)}
                                  </div>
                                  <div>
                                    <span className="text-xs font-semibold text-[#1a1a1a] font-sans">{item.profile.displayName}</span>
                                    {item.id === currentUser?.uid && (
                                      <span className="text-[8px] font-bold border border-[#1a1a1a] text-[#1a1a1a] py-0.5 px-1.5 uppercase ml-2 select-none">Own Key</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Target UID code block */}
                              <td className="py-3 font-mono text-[10px] text-[#1a1a1a]/50 select-all tracking-tight font-light">
                                {item.id}
                              </td>

                              {/* Badge showing current role */}
                              <td className="py-3">
                                <span className={`text-[8px] font-bold uppercase py-0.5 px-2 tracking-widest border ${
                                  item.profile.role === 'admin' ? 'bg-[#1a1a1a] text-[#FDFCFB] border-transparent' :
                                  'border-[#1a1a1a]/30 text-[#1a1a1a]/80'
                                }`}>
                                  {item.profile.role}
                                </span>
                              </td>

                              {/* Dropdown switch controls */}
                              <td className="py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <select
                                    disabled={item.id === currentUser?.uid && item.profile.role === 'admin'} // Cannot self-demote safety block
                                    value={item.profile.role}
                                    id={`role_select_${item.id}`}
                                    onChange={(e) => handleRoleChange(item.id, item.profile.displayName, e.target.value as UserRole)}
                                    className="bg-transparent text-[#1a1a1a] text-[10px] font-bold border border-[#1a1a1a]/30 rounded-none px-2 py-1.5 focus:border-[#1a1a1a] outline-none cursor-pointer uppercase font-mono tracking-wider hover:bg-[#1a1a1a]/5 transition-all"
                                  >
                                    <option value="user">USER (Level 1)</option>
                                    <option value="moderator">AUDITOR (Level 2)</option>
                                    <option value="admin">ADMIN (Level 3)</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Moderator Control Audit Logs Tab */}
            {activeTab === 'logs' && isModerator && (
              <motion.div
                key="tab-logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
                id="panel_logs"
              >
                <div className="border border-[#1a1a1a]/10 p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-[#1a1a1a]/10 pb-4">
                    <div>
                      <h4 className="text-sm font-serif italic text-[#1a1a1a] tracking-tight">
                        Access Interaction Ledger
                      </h4>
                      <p className="text-[11px] text-[#1a1a1a]/60 mt-0.5">
                        Track historical security interactions. Ledger details are historically read-only and immutable.
                      </p>
                    </div>

                    <button
                      id="refresh_logs_btn"
                      onClick={fetchAuditLogs}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a] hover:opacity-70 transition-opacity cursor-pointer font-mono"
                    >
                      <RefreshCw size={11} className={loadingLogs ? 'animate-spin' : ''} />
                      Reload Ledger
                    </button>
                  </div>

                  {/* Filters / Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6 font-mono">
                    <div className="flex bg-[#1a1a1a]/5 items-center px-3 py-1.5 border border-[#1a1a1a]/10 w-full sm:max-w-xs">
                      <Search size={13} className="opacity-40 shrink-0" />
                      <input
                        id="logs_search_input"
                        type="text"
                        className="text-xs bg-transparent ml-2 outline-none w-full text-[#1a1a1a] placeholder:opacity-40"
                        placeholder="Search detail events or emails..."
                        value={logsSearch}
                        onChange={(e) => setLogsSearch(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Filter size={13} className="opacity-40" />
                      <select
                        id="logs_category_filter"
                        value={logsFilter}
                        onChange={(e) => setLogsFilter(e.target.value)}
                        className="bg-transparent text-[#1a1a1a] text-[10px] font-bold border border-[#1a1a1a]/30 rounded-none px-2 py-1.5 focus:border-[#1a1a1a] outline-none cursor-pointer uppercase tracking-wider font-mono hover:bg-[#1a1a1a]/5 transition-all"
                      >
                        <option value="ALL">ALL EVENTS</option>
                        <option value="LOGIN">LOGIN EVENTS</option>
                        <option value="REGISTER">REGISTRATIONS</option>
                        <option value="ROLE_CHANGE">PRIVILEGE EVENTS</option>
                        <option value="PROFILE_RENAME">PROFILE EVENTS</option>
                      </select>
                    </div>
                  </div>

                  {/* Ledger Display List */}
                  {loadingLogs ? (
                    <div className="text-center py-10 space-y-2">
                      <svg className="animate-spin h-5 w-5 text-[#1a1a1a] mx-auto" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-[10px] font-mono text-[#1a1a1a]/40">Loading secure logs from audit pool...</p>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-xs text-[#1a1a1a]/50 border border-dashed border-[#1a1a1a]/10 font-mono">
                      No security audit events recorded.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-4 border border-[#1a1a1a]/10 hover:bg-[#1a1a1a]/5 text-[11px] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors font-mono"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 border tracking-widest ${
                                log.action === 'ROLE_CHANGE' ? 'bg-[#1a1a1a] text-white border-transparent' :
                                log.action === 'LOGIN' ? 'border-[#10B981] text-[#10B981]' :
                                'border-[#1a1a1a]/50 text-[#1a1a1a]/80'
                              }`}>
                                {log.action}
                              </span>
                              <span className="font-semibold text-[#1a1a1a]/60 flex items-center gap-1 tracking-tight">
                                <Mail size={10} />
                                {log.userEmail}
                              </span>
                            </div>
                            <p className="text-[#1a1a1a]/95 font-medium leading-relaxed font-sans">
                              {log.details}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-1 text-[9px] font-mono text-[#1a1a1a]/40 uppercase tracking-widest font-bold">
                            <Clock size={10} />
                            {log.timestamp}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Secure Workspace Tab */}
            {activeTab === 'resource' && (
              <motion.div
                key="tab-resource"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
                id="panel_resource"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* Left board details */}
                  <div className="border border-[#1a1a1a]/10 p-6 md:col-span-1 space-y-5">
                    <h4 className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1a1a1a]/50 flex items-center gap-2 mb-4 border-b border-[#1a1a1a]/10 pb-2">
                      <FileKey size={13} /> Active Assertions
                    </h4>

                    <div className="p-4 bg-[#1a1a1a]/5 border-l-2 border-[#1a1a1a] text-[11px] font-mono text-[#1a1a1a]/85 leading-relaxed space-y-3">
                      <p className="font-bold uppercase tracking-wider text-black">
                        Encrypted Ledger Check
                      </p>
                      <p>
                        Session entities are packaged dynamically and authenticated via client variables matching standard federated schemas.
                      </p>
                      <p>
                        Path-based lookups remain inaccessible to role tiers lower than auditor, enforcing absolute isolation.
                      </p>
                    </div>

                    <div className="space-y-2 text-[10px] text-[#1a1a1a]/65 font-mono">
                      <div className="flex justify-between py-1.5 border-b border-[#1a1a1a]/5">
                        <span>DATA SYSTEM</span>
                        <span className="text-[#1a1a1a] font-bold font-sans">Firestore ABAC</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[#1a1a1a]/5">
                        <span>TOKEN STRUCT</span>
                        <span className="text-[#1a1a1a] font-bold font-sans">JWT Token</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span>CIPHER VERIFY</span>
                        <span className="text-emerald-700 font-extrabold uppercase font-sans tracking-wide">SECURED-OK</span>
                      </div>
                    </div>
                  </div>

                  {/* Right boards: Post sandbox */}
                  <div className="border border-[#1a1a1a]/10 p-6 md:col-span-2 space-y-6">
                    <div>
                      <h4 className="text-sm font-serif italic text-[#1a1a1a] tracking-tight">
                        Secured Input Sandbox Board
                      </h4>
                      <p className="text-[11px] text-[#1a1a1a]/60 mt-0.5">
                        Test active write queries live, generating real-time audit ledger updates attached securely to your authenticated key.
                      </p>
                    </div>

                    <form onSubmit={handleAddNote} className="space-y-3">
                      <textarea
                        id="sandbox_note_textarea"
                        rows={3}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type a verified note to test secure stream modifications..."
                        className="w-full text-xs p-3.5 bg-[#1a1a1a]/5 border border-[#1a1a1a]/20 rounded-none focus:border-[#1a1a1a] focus:bg-transparent text-[#1a1a1a] focus:outline-none placeholder:opacity-50 font-sans"
                        maxLength={200}
                        required
                      />

                      <button
                        id="sandbox_submit_btn"
                        type="submit"
                        className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-black text-[#FDFCFB] text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all"
                      >
                        <PlusCircle size={12} />
                        Publish secured block
                      </button>
                    </form>

                    <div className="space-y-3">
                      <p className="text-[9px] font-bold text-[#1a1a1a]/40 uppercase tracking-[0.2em] font-mono border-b border-[#1a1a1a]/10 pb-1">
                        Active Database Records
                      </p>
                      
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 font-sans">
                        {secureNotes.length === 0 ? (
                          <div className="text-center py-8 text-[11px] font-mono text-[#1a1a1a]/40 border border-dashed border-[#1a1a1a]/15">
                            No active board entries posted in current session coordinates. Write above to trigger interaction.
                          </div>
                        ) : (
                          secureNotes.map((note, index) => (
                            <div key={index} className="p-4 border border-[#1a1a1a]/10 text-xs text-[#1a1a1a] relative">
                              <div className="flex justify-between items-center mb-1.5 border-b border-[#1a1a1a]/5 pb-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    style={{ backgroundColor: note.color }}
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                  />
                                  <span className="font-bold tracking-tight text-[#1a1a1a]/85">{note.author}</span>
                                </div>
                                <span className="text-[9px] font-mono text-[#1a1a1a]/45 flex items-center gap-0.5 uppercase tracking-wide">
                                  <Clock size={9} /> {note.dateStr}
                                </span>
                              </div>
                              <p className="text-[#1a1a1a]/80 leading-relaxed font-medium">
                                {note.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

      {/* 3. Footer branding */}
      <footer id="dashboard_footer" className="bg-[#FDFCFB] border-t border-[#1a1a1a]/10 py-5 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] text-[#1a1a1a]/45 font-mono uppercase tracking-widest font-bold">
          <p>
            &copy; 2026 FORTRESS SESSION INTEGRATION &bull; IMMUTABLE AUDIT LOGS.
          </p>
          <p className="mt-2 md:mt-0 flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck size={12} className="text-emerald-600 animate-pulse" />
            Audit Protocol Secure
          </p>
        </div>
      </footer>

    </div>
  );
}
