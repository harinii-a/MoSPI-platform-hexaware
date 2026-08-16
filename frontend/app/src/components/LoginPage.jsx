import React, { useState } from 'react';
import { Shield, ArrowRight, Sparkles } from 'lucide-react';
import { authApi } from '../api';

export default function LoginPage({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleEnterPlatform = async () => {
    setLoading(true);
    try {
      // Direct Admin Access
      const res = await authApi.login('admin', 'admin123');
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      console.error('Portal entry error:', err);
      // Fallback local admin if backend offline
      onLogin(
        {
          username: 'admin',
          name: 'Dr. Rajesh Kumar',
          role: 'ADMIN',
          department: 'Data Management & Quality Assurance',
        },
        'bearer_mock_admin_token'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Background Decorative Ambient Gradients (Light Theme) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-100/60 via-indigo-50/40 to-transparent pointer-events-none blur-3xl -z-0" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-purple-100/40 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* ─── Main Hero Section (Header removed) ───────────────────── */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 lg:py-24 flex-1 flex flex-col justify-center items-center text-center">
        <div className="space-y-6">
          {/* Official Emblem Logo */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-600 border-2 border-slate-900 shadow-sketch mb-2 text-white">
            <Shield className="w-8 h-8 text-white" />
          </div>

          {/* Badge */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white border-2 border-slate-900 rounded-full px-4 py-1.5 shadow-sketch-sm">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-black text-slate-900">
                MoSPI National Statistical Survey Intelligence Engine
              </span>
            </div>
          </div>

          {/* Hero Heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Empowering India's Survey Microdata with <span className="text-blue-600 underline decoration-blue-300 decoration-wavy decoration-2">Automated AI</span> & Deep Diagnostics
          </h2>

          {/* Subheading */}
          <p className="text-sm sm:text-base text-slate-600 font-semibold leading-relaxed max-w-2xl mx-auto">
            Autonomous schema discovery, sub-second statistical distributions, 4-factor composite AI risk scoring, and publication-grade official reporting for national household survey microdata.
          </p>

          {/* Main Primary CTA Button */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleEnterPlatform}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-base px-10 py-4.5 rounded-2xl border-2 border-slate-900 shadow-sketch transition-all hover:shadow-sketch-lg active:translate-y-0.5 cursor-pointer disabled:opacity-60"
            >
              <span>{loading ? 'Initializing Admin Workspace...' : 'Enter Survey Intelligence Platform'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Admin Direct Access Sub-Pill */}
          <p className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 pt-2">
            <Shield className="w-3.5 h-3.5 text-blue-600" /> Direct Administrator Access • Full Privileges Enabled
          </p>
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t-2 border-slate-900 bg-white py-4 px-6 text-center text-xs text-slate-500 font-bold">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Ministry of Statistics and Programme Implementation (MoSPI) • National Statistical Office (NSO)
          </span>
          <span className="text-slate-400">
            Government of India • Survey Microdata Intelligence Platform
          </span>
        </div>
      </footer>
    </div>
  );
}
