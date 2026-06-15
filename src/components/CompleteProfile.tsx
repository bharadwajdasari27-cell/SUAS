/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

const COLORS_ARRAY = [
  '#1a1a1a', // Obsidian Charcoal
  '#8B5CF6', // Velvet Purple
  '#0EA5E9', // Sky Blue
  '#10B981', // Emerald Sage
  '#EF4444', // Terracotta Red
  '#F59E0B', // Ochre Gold
  '#EC4899', // Antique Pink
];

export default function CompleteProfile() {
  const { currentUser, completeUserProfile, logout } = useAuth();
  
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [selectedColor, setSelectedColor] = useState(COLORS_ARRAY[0]);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || displayName.trim().length < 2) {
      setErrorMsg('Display Name must be at least 2 characters.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await completeUserProfile(displayName.trim(), selectedColor);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to complete profile registration. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="complete_profile_container" className="min-h-screen w-full bg-[#FDFCFB] text-[#1a1a1a] font-sans flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-fade-in">
      
      {/* Left Section: Complete Profile Form */}
      <div className="w-full md:w-[460px] lg:w-[480px] shrink-0 flex flex-col justify-between p-8 sm:p-12 md:p-16 border-b md:border-b-0 md:border-r border-[#1a1a1a]/10 bg-[#FDFCFB] overflow-y-auto">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase opacity-45 flex items-center gap-1.5 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Profile Key Allocation
          </span>
          <h1 className="text-4xl font-serif italic mt-2 text-[#1a1a1a] tracking-tight">Finalizing Key</h1>
        </div>

        <div className="my-10 md:my-auto max-w-sm w-full mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase mb-6 opacity-50 font-mono">
            Set Human Handle
          </h2>
          
          {errorMsg && (
            <div id="complete_profile_error" className="mb-6 p-3.5 bg-red-50 text-red-800 text-[11px] border border-red-100 rounded flex items-start gap-2 font-mono leading-relaxed">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5 flex flex-col">
              <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                Display Name (User Handle)
              </label>
              <input
                id="profile_name_input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-2 focus:outline-none placeholder:opacity-25 text-base text-[#1a1a1a] transition-all rounded-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                Preferred Identity Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS_ARRAY.map((color) => (
                  <button
                    key={color}
                    id={`complete_color_${color.replace('#', '')}`}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-5 w-5 rounded-full cursor-pointer transition-all ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-[#1a1a1a] scale-110' : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#1a1a1a]/5 text-[11px] text-[#1a1a1a]/85 leading-relaxed font-mono border-l-2 border-[#1a1a1a] space-y-1.5 text-left">
              <span className="font-bold text-black block uppercase tracking-wider">Session Note:</span>
              <p>
                Complete profile allocation will automatically stamp your profile with user privileges in the Firestore database.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                id="complete_profile_submit_btn"
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1a1a1a] text-[#FDFCFB] py-4 text-xs font-bold uppercase tracking-[0.25em] hover:bg-black hover:tracking-[0.3em] transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Registering Identity...' : 'Allocate System Key'}
              </button>

              <button
                id="complete_profile_logout_btn"
                type="button"
                onClick={logout}
                className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors py-2 cursor-pointer font-mono"
              >
                Cancel & Sign Out
              </button>
            </div>
          </form>
        </div>

        <div className="text-[9px] leading-relaxed opacity-45 font-mono tracking-wider pt-6 border-t border-[#1a1a1a]/10">
          <p>&copy; 2026 FORTRESS SYSTEM. ALL RIGHTS RESERVED.</p>
          <p className="mt-1">SECURED AND ENCRYPTED SESSION.</p>
        </div>
      </div>

      {/* Right Section: Editorial Visual */}
      <div className="flex-1 relative hidden md:flex flex-col justify-center items-center bg-[#1a1a1a] text-[#FDFCFB] p-12 md:p-20 overflow-hidden select-none">
        {/* Massive Typographic Element */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <span className="text-[35rem] font-serif italic select-none">K</span>
        </div>

        <div className="relative z-10 text-center max-w-md">
          <span className="text-xs uppercase tracking-[0.5em] mb-4 block opacity-55 font-mono">Volume IV — Issue III</span>
          <h3 className="text-7xl leading-[1.05] font-serif italic mb-8 tracking-tight">
            Identity<br />&nbsp;&nbsp;&nbsp;Keyboards
          </h3>
          <p className="text-sm leading-relaxed opacity-60 font-serif italic max-w-sm mx-auto">
            "We build keys not to hide from the world, but to establish home within the curated landscapes we create."
          </p>
        </div>

        <div className="absolute bottom-16 right-16 flex gap-12 items-center font-mono text-left">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest opacity-40">Status</span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#FDFCFB]">Forming Access</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest opacity-40">Node</span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#FDFCFB]">Global-02</span>
          </div>
        </div>

        {/* Vertical Rail Text */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180 flex items-center gap-4 opacity-30 font-mono">
          <div className="w-px h-12 bg-[#FDFCFB]"></div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-[#FDFCFB]">Curated Security Protocol v2.6</span>
        </div>
      </div>

    </div>
  );
}
