/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Standard background palette colors for avatars
const COLORS_ARRAY = [
  '#1a1a1a', // Obsidian Charcoal
  '#8B5CF6', // Velvet Purple
  '#0EA5E9', // Sky Blue
  '#10B981', // Emerald Sage
  '#EF4444', // Terracotta Red
  '#F59E0B', // Ochre Gold
  '#EC4899', // Antique Pink
];

export default function AuthScreens() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Register States
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerColor, setRegisterColor] = useState(COLORS_ARRAY[0]);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  // Guide Toggle
  const [showConfigTips, setShowConfigTips] = useState(false);

  // Reset errors on switch
  const handleTabSwitch = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setLoginError('');
    setRegisterError('');
    setRegisterSuccess('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both your email address and password.');
      return;
    }
    setLoginSubmitting(true);
    setLoginError('');
    try {
      await loginWithEmail(loginEmail, loginPassword);
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Invalid email or password. Please verify credentials and retry.';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        errMsg = 'Incorrect credentials. Please verify your email and password.';
      } else if (err?.code === 'auth/invalid-email') {
        errMsg = 'The email address format is invalid.';
      } else if (err?.code === 'auth/configuration-not-found') {
        errMsg = 'Email/Password auth is not enabled in Firebase Auth Console. Click "Configuration Help" below.';
      }
      setLoginError(err?.message || errMsg);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerEmail || !registerPassword || !registerDisplayName) {
      setRegisterError('All fields including User Display Name are mandatory.');
      return;
    }
    if (registerDisplayName.trim().length < 2) {
      setRegisterError('Display Name must be at least 2 characters long.');
      return;
    }
    if (registerPassword.length < 6) {
      setRegisterError('Password must contain at least 6 characters.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }

    setRegisterSubmitting(true);
    try {
      await signUpWithEmail(
        registerEmail.trim(),
        registerPassword,
        registerDisplayName.trim(),
        registerColor
      );
      setRegisterSuccess('Account created successfully! Session is initializing...');
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Failed to compile account registration.';
      if (err?.code === 'auth/email-already-in-use') {
        errMsg = 'An account under this email address already exists.';
      } else if (err?.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address format.';
      } else if (err?.code === 'auth/weak-password') {
        errMsg = 'Password must be at least 6 characters.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password provider is not activated in Firebase console. Click "Configuration Help" below.';
      }
      setRegisterError(err?.message || errMsg);
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setRegisterError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setLoginError(err?.message || 'Google Authentication failed. Please re-check configuration.');
    }
  };

  return (
    <div id="auth_page_container" className="min-h-screen w-full bg-[#FDFCFB] text-[#1a1a1a] font-sans flex flex-col md:flex-row overflow-y-auto md:overflow-hidden animate-fade-in">
      {/* Left Section: Authentication Form */}
      <div className="w-full md:w-[460px] lg:w-[480px] shrink-0 flex flex-col justify-between p-8 sm:p-12 md:p-16 border-b md:border-b-0 md:border-r border-[#1a1a1a]/10 bg-[#FDFCFB] overflow-y-auto">
        <div>
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase opacity-45 flex items-center gap-1.5 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Secured Vault Gate
          </span>
          <h1 className="text-4xl font-serif italic mt-2 text-[#1a1a1a] tracking-tight">The Fortress</h1>
        </div>

        <div className="my-10 md:my-auto max-w-sm w-full mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.25em] uppercase mb-6 opacity-50 font-mono">
            {activeTab === 'login' ? 'Member Authorization' : 'New Key Registration'}
          </h2>
          
          {/* Custom Tabs */}
          <div id="auth_tabs_container" className="flex border-b border-[#1a1a1a]/10 pb-2 mb-8 gap-6">
            <button
              id="tab_login_btn"
              onClick={() => handleTabSwitch('login')}
              className={`pb-2 text-left text-xs font-bold uppercase tracking-[0.15em] transition-all duration-200 cursor-pointer ${
                activeTab === 'login'
                  ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]'
                  : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab_register_btn"
              onClick={() => handleTabSwitch('register')}
              className={`pb-2 text-left text-xs font-bold uppercase tracking-[0.15em] transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]'
                  : 'text-[#1a1a1a]/40 hover:text-[#1a1a1a]'
              }`}
            >
              Register Key
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                id="login_section"
                className="space-y-6"
              >
                {loginError && (
                  <div id="login_error_banner" className="p-3.5 bg-red-50 text-red-800 text-[11px] border border-red-100 rounded flex items-start gap-2 font-mono leading-relaxed max-w-sm">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                      Identity / Email
                    </label>
                    <input
                      id="login_email_input"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="user@fortress.co"
                      className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-2 focus:outline-none placeholder:opacity-25 text-base text-[#1a1a1a] transition-all rounded-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col">
                    <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                      Secret / Password
                    </label>
                    <input
                      id="login_password_input"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-2 focus:outline-none placeholder:opacity-25 text-base text-[#1a1a1a] transition-all rounded-none"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="submit_login_btn"
                      type="submit"
                      disabled={loginSubmitting}
                      className="w-full bg-[#1a1a1a] text-[#FDFCFB] py-4 text-xs font-bold uppercase tracking-[0.25em] hover:bg-black hover:tracking-[0.3em] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loginSubmitting ? 'Authenticating...' : 'Authorize Access'}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                id="register_section"
                className="space-y-5"
              >
                {registerError && (
                  <div id="register_error_banner" className="p-3.5 bg-red-50 text-red-800 text-[11px] border border-red-100 rounded flex items-start gap-2 font-mono leading-relaxed text-left">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
                    <span>{registerError}</span>
                  </div>
                )}

                {registerSuccess && (
                  <div id="register_success_banner" className="p-3.5 bg-emerald-50 text-emerald-900 text-[11px] border border-emerald-100 rounded flex items-start gap-2 font-mono leading-relaxed text-left">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                    <span>{registerSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="space-y-1 flex flex-col">
                    <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                      Display Handle / Name
                    </label>
                    <input
                      id="register_name_input"
                      type="text"
                      value={registerDisplayName}
                      onChange={(e) => setRegisterDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-1.5 focus:outline-none placeholder:opacity-25 text-base text-[#1a1a1a] transition-all rounded-none"
                      required
                    />
                  </div>

                  <div className="space-y-1 flex flex-col">
                    <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                      Key Allocation Email
                    </label>
                    <input
                      id="register_email_input"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="jane@fortress.co"
                      className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-1.5 focus:outline-none placeholder:opacity-25 text-base text-[#1a1a1a] transition-all rounded-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 flex flex-col">
                      <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                        Password
                      </label>
                      <input
                        id="register_password_input"
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-1.5 focus:outline-none placeholder:opacity-25 text-base text-[#1a1a1a] transition-all rounded-none"
                        required
                      />
                    </div>
                    <div className="space-y-1 flex flex-col">
                      <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono text-[#1a1a1a]">
                        Confirm
                      </label>
                      <input
                        id="register_confirm_input"
                        type="password"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent border-b border-[#1a1a1a]/30 focus:border-[#1a1a1a] py-1.5 focus:outline-none placeholder:opacity-25 text-base text-[#1a1a1a] transition-all rounded-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Avatar Color Selection */}
                  <div className="pt-1">
                    <label className="block text-[9px] uppercase tracking-[0.15em] font-bold opacity-45 font-mono mb-2 text-[#1a1a1a]">
                      Preferred Color Stamp
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS_ARRAY.map((color) => (
                        <button
                          key={color}
                          id={`color_selector_${color.replace('#', '')}`}
                          type="button"
                          onClick={() => setRegisterColor(color)}
                          style={{ backgroundColor: color }}
                          className={`h-5 w-5 rounded-full cursor-pointer transition-all ${
                            registerColor === color ? 'ring-2 ring-offset-2 ring-[#1a1a1a] scale-110' : 'opacity-85 hover:opacity-100 hover:scale-105'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      id="submit_register_btn"
                      type="submit"
                      disabled={registerSubmitting}
                      className="w-full bg-[#1a1a1a] text-[#FDFCFB] py-4 text-xs font-bold uppercase tracking-[0.25em] hover:bg-black hover:tracking-[0.3em] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {registerSubmitting ? 'Registering...' : 'Register Secure Key'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Federated SSO Splitter */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1a1a1a]/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.15em] font-mono leading-none">
                <span className="bg-[#FDFCFB] px-3.5 text-[#1a1a1a]/45">Or gateway provider</span>
              </div>
            </div>

            <div className="mt-5">
              <button
                id="google_signin_btn"
                onClick={handleGoogleSignIn}
                type="button"
                className="w-full flex items-center justify-center gap-3 px-4 py-4 border border-[#1a1a1a] text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a] hover:text-[#FDFCFB] transition-all cursor-pointer bg-transparent"
              >
                <svg className="h-4 w-4 fill-current shrink-0" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.8h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.86-3.577-7.86-8s3.53-8 7.86-8c2.46 0 4.105 1.025 5.047 1.926l2.778-2.678C18.064 1.764 15.36 1 12.24 1v22c3.12 0 5.824-.764 7.625-1.849 1.802-1.085 2.138-1.516 2.138-2.674V10.285H12.24z"/>
                </svg>
                Google Single Sign-On
              </button>
            </div>
          </div>

          {/* Configuration helper */}
          <div className="mt-6 border-t border-[#1a1a1a]/10 pt-4">
            <button
              id="toggle_tips_btn"
              onClick={() => setShowConfigTips(!showConfigTips)}
              className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[0.15em] hover:opacity-70 transition-opacity font-mono text-[#1a1a1a]/60 mx-auto cursor-pointer"
            >
              <HelpCircle size={13} />
              {showConfigTips ? 'Hide Sandbox Guidelines' : 'Sandbox Guidelines'}
            </button>
            
            <AnimatePresence>
              {showConfigTips && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3"
                  id="sandbox_tips_card"
                >
                  <div className="p-4 bg-[#1a1a1a]/5 text-[11px] text-[#1a1a1a]/85 leading-relaxed font-mono border-l-2 border-[#1a1a1a] space-y-1.5 text-left">
                    <p className="font-bold uppercase tracking-wider text-black">
                      Project Configuration:
                    </p>
                    <p>
                        This system uses federated single sign-on pre-configured inside your Workspace sandbox account.
                    </p>
                    <p>
                        For traditional password authentication, please verify that Email/Password is enabled in the Firebase Console:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1.5 mt-1">
                      <li>Open Firebase Console</li>
                      <li>Navigate to Authentication</li>
                      <li>Go to Sign-in method</li>
                      <li>Allow Email/Password auth</li>
                    </ol>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-[9px] leading-relaxed opacity-45 font-mono tracking-wider pt-6 border-t border-[#1a1a1a]/10">
          <p>&copy; 2026 FORTRESS SYSTEM. ALL RIGHTS RESERVED.</p>
          <p className="mt-1">ENCRYPTED AT WORKSPACE NODE PRESETS.</p>
        </div>
      </div>

      {/* Right Section: Editorial Visual */}
      <div className="flex-1 relative hidden md:flex flex-col justify-center items-center bg-[#1a1a1a] text-[#FDFCFB] p-12 md:p-20 overflow-hidden select-none">
        {/* Massive Typographic Element */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
          <span className="text-[35rem] font-serif italic select-none">F</span>
        </div>

        <div className="relative z-10 text-center max-w-md">
          <span className="text-xs uppercase tracking-[0.5em] mb-4 block opacity-55 font-mono">Volume IV — Issue II</span>
          <h3 className="text-7xl leading-[1.05] font-serif italic mb-8 tracking-tight">
            Curated<br />&nbsp;&nbsp;&nbsp;Stillness
          </h3>
          <p className="text-sm leading-relaxed opacity-60 font-serif italic max-w-sm mx-auto">
            "The entrance to the digital archive is a threshold between the noise of the public web and the curated stillness of private discovery."
          </p>
        </div>

        <div className="absolute bottom-16 right-16 flex gap-12 items-center font-mono text-left">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest opacity-40">Status</span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#FDFCFB]">Restricted Access</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-widest opacity-40">Node</span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#FDFCFB]">Global-01</span>
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
