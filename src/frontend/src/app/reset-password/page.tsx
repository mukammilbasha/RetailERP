"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, ArrowLeft, X, Check } from "lucide-react";
import api from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*  Inline CSS — shared visual system                                         */
/* -------------------------------------------------------------------------- */
const styles = `
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.auth-bg {
  background: linear-gradient(-45deg, hsl(230 45% 8%), hsl(250 40% 12%), hsl(220 50% 10%), hsl(240 35% 14%));
  background-size: 400% 400%;
  animation: gradientShift 20s ease infinite;
}
.scene-3d { perspective: 1200px; transform-style: preserve-3d; }
@keyframes rotatePlatform {
  0%   { transform: rotateX(15deg) rotateY(0deg); }
  100% { transform: rotateX(15deg) rotateY(360deg); }
}
.platform { transform-style: preserve-3d; animation: rotatePlatform 30s linear infinite; }
@keyframes floatCube {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-18px); }
}
.cube-container { transform-style: preserve-3d; }
.cube { transform-style: preserve-3d; animation: floatCube 4s ease-in-out infinite; }
.cube-face {
  position: absolute; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  backface-visibility: hidden;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px; font-size: 11px; font-weight: 600;
  letter-spacing: 0.5px; text-transform: uppercase;
}
.cube-face.front  { transform: translateZ(40px); }
.cube-face.back   { transform: rotateY(180deg) translateZ(40px); }
.cube-face.right  { transform: rotateY(90deg) translateZ(40px); }
.cube-face.left   { transform: rotateY(-90deg) translateZ(40px); }
.cube-face.top    { transform: rotateX(90deg) translateZ(40px); }
.cube-face.bottom { transform: rotateX(-90deg) translateZ(40px); }

@keyframes orbitRing {
  0%   { transform: rotateX(70deg) rotateZ(0deg); }
  100% { transform: rotateX(70deg) rotateZ(360deg); }
}
.orbit-ring { border: 2px solid hsl(var(--primary) / 0.2); border-radius: 50%; animation: orbitRing 12s linear infinite; transform-style: preserve-3d; }
.orbit-ring-2 { border: 1.5px dashed hsl(var(--primary) / 0.12); border-radius: 50%; animation: orbitRing 18s linear infinite reverse; transform-style: preserve-3d; }

@keyframes orbitDot {
  0%   { transform: rotate(0deg) translateX(120px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
}
@keyframes orbitDot2 {
  0%   { transform: rotate(0deg) translateX(160px) rotate(0deg); }
  100% { transform: rotate(-360deg) translateX(160px) rotate(360deg); }
}
.orbit-dot { width: 8px; height: 8px; border-radius: 50%; position: absolute; top: 50%; left: 50%; margin: -4px; background: hsl(var(--primary)); box-shadow: 0 0 12px hsl(var(--primary) / 0.6); animation: orbitDot 8s linear infinite; }
.orbit-dot-2 { width: 6px; height: 6px; border-radius: 50%; position: absolute; top: 50%; left: 50%; margin: -3px; background: hsl(var(--primary) / 0.7); box-shadow: 0 0 10px hsl(var(--primary) / 0.4); animation: orbitDot2 14s linear infinite; }

@keyframes gridPulse { 0%, 100% { opacity: 0.08; } 50% { opacity: 0.15; } }
.grid-floor {
  background-image: linear-gradient(hsl(var(--primary) / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.15) 1px, transparent 1px);
  background-size: 40px 40px; animation: gridPulse 6s ease-in-out infinite;
}

@keyframes spherePulse {
  0%, 100% { box-shadow: 0 0 30px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--primary) / 0.15); transform: scale(1); }
  50%      { box-shadow: 0 0 45px hsl(var(--primary) / 0.5), 0 0 90px hsl(var(--primary) / 0.25); transform: scale(1.08); }
}
.center-sphere { animation: spherePulse 4s ease-in-out infinite; background: radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.4)); }

@keyframes linePulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.4; } }
.conn-line { background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent); animation: linePulse 3s ease-in-out infinite; }

@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
.fade-in-1 { animation: fadeInUp 0.5s ease-out 0.1s both; }
.fade-in-2 { animation: fadeInUp 0.5s ease-out 0.25s both; }
.fade-in-3 { animation: fadeInUp 0.5s ease-out 0.4s both; }
.fade-in-4 { animation: fadeInUp 0.5s ease-out 0.55s both; }

@keyframes panelSlideIn { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
.panel-fade { animation: panelSlideIn 0.8s ease-out 0.2s both; }

@keyframes labelFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.erp-label { animation: labelFloat 5s ease-in-out infinite; }

.input-glow:focus-within { box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15); border-color: hsl(var(--primary)); }
.btn-primary { transition: all 0.2s ease; }
.btn-primary:hover:not(:disabled) { transform: scale(1.015); box-shadow: 0 4px 20px hsl(var(--primary) / 0.4); }
.btn-primary:active:not(:disabled) { transform: scale(0.985); }
`;

/* -------------------------------------------------------------------------- */
/*  ERP modules for 3D scene                                                  */
/* -------------------------------------------------------------------------- */
const erpModules = [
  { name: "Inventory",   color: "rgba(59, 130, 246, 0.25)", textColor: "#60a5fa", x: -100, y: -60,  z: 30,  delay: "0s" },
  { name: "Billing",     color: "rgba(16, 185, 129, 0.25)", textColor: "#34d399", x: 100,  y: -50,  z: -20, delay: "0.7s" },
  { name: "Orders",      color: "rgba(245, 158, 11, 0.25)", textColor: "#fbbf24", x: -80,  y: 70,   z: -30, delay: "1.4s" },
  { name: "Warehouse",   color: "rgba(139, 92, 246, 0.25)", textColor: "#a78bfa", x: 90,   y: 60,   z: 40,  delay: "2.1s" },
  { name: "Reports",     color: "rgba(236, 72, 153, 0.25)", textColor: "#f472b6", x: 0,    y: -100, z: 0,   delay: "2.8s" },
  { name: "Production",  color: "rgba(20, 184, 166, 0.25)", textColor: "#2dd4bf", x: 0,    y: 100,  z: 10,  delay: "3.5s" },
];

/* -------------------------------------------------------------------------- */
/*  Password strength                                                         */
/* -------------------------------------------------------------------------- */
function getStrength(pwd: string) {
  if (!pwd) return { label: "", color: "", width: "0%", level: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { label: "Weak",   color: "bg-red-500",    width: "33%",  level: 1 };
  if (score <= 3) return { label: "Fair",   color: "bg-yellow-500", width: "66%",  level: 2 };
  return             { label: "Strong", color: "bg-green-500",  width: "100%", level: 3 };
}

/* -------------------------------------------------------------------------- */
/*  Left 3D panel (extracted to keep JSX DRY)                                */
/* -------------------------------------------------------------------------- */
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] items-center justify-center relative panel-fade">
      <div className="absolute inset-0 grid-floor" style={{ transform: "perspective(600px) rotateX(60deg)", transformOrigin: "center bottom" }} />
      <div className="scene-3d relative" style={{ width: 420, height: 420 }}>
        <div className="orbit-ring absolute" style={{ width: 280, height: 280, top: "50%", left: "50%", marginTop: -140, marginLeft: -140 }} />
        <div className="orbit-ring-2 absolute" style={{ width: 360, height: 360, top: "50%", left: "50%", marginTop: -180, marginLeft: -180 }} />
        <div className="orbit-dot" />
        <div className="orbit-dot-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="center-sphere w-20 h-20 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg tracking-wider">ERP</span>
          </div>
        </div>
        <div className="platform absolute inset-0">
          {erpModules.map((mod) => (
            <div key={mod.name} className="cube-container absolute" style={{ top: "50%", left: "50%", transform: `translate(-50%, -50%) translate3d(${mod.x}px, ${mod.y}px, ${mod.z}px)` }}>
              <div className="cube relative" style={{ width: 80, height: 80, animationDelay: mod.delay }}>
                <div className="cube-face front" style={{ background: mod.color, color: mod.textColor }}>{mod.name}</div>
                <div className="cube-face back"  style={{ background: mod.color, color: mod.textColor }}>{mod.name}</div>
                <div className="cube-face right" style={{ background: mod.color }} />
                <div className="cube-face left"  style={{ background: mod.color }} />
                <div className="cube-face top"   style={{ background: mod.color.replace("0.25", "0.35") }} />
                <div className="cube-face bottom" style={{ background: mod.color.replace("0.25", "0.1") }} />
              </div>
            </div>
          ))}
        </div>
        {erpModules.map((mod, i) => {
          const angle = Math.atan2(mod.y, mod.x);
          const dist  = Math.sqrt(mod.x * mod.x + mod.y * mod.y);
          return (
            <div key={`line-${i}`} className="conn-line absolute" style={{ top: "50%", left: "50%", width: dist * 0.6, height: 1, transformOrigin: "0 50%", transform: `rotate(${angle}rad)`, animationDelay: `${i * 0.5}s` }} />
          );
        })}
      </div>
      <div className="absolute bottom-12 left-0 right-0 text-center">
        <div className="erp-label inline-block">
          <h2 className="text-2xl font-bold text-white/90 tracking-tight">
            EL CURIO <span className="text-white/40 font-normal">|</span>{" "}
            <span style={{ color: "hsl(var(--primary))" }}>RetailERP</span>
          </h2>
          <p className="mt-2 text-sm text-white/40 max-w-sm mx-auto">
            Enterprise-grade platform for footwear, bags &amp; belts distribution.
          </p>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Rule row helper                                                           */
/* -------------------------------------------------------------------------- */
function RuleRow({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${met ? "bg-green-100 dark:bg-green-500/20" : "bg-gray-100 dark:bg-white/[0.06]"}`}>
        {met ? <Check className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 block" />}
      </div>
      {label}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Inner component (reads useSearchParams — must be inside Suspense)        */
/* -------------------------------------------------------------------------- */
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [success, setSuccess]               = useState(false);
  const [apiError, setApiError]             = useState("");

  const strength = getStrength(newPassword);

  // Password rules
  const rules = {
    minLength:  newPassword.length >= 8,
    hasUpper:   /[A-Z]/.test(newPassword),
    hasNumber:  /[0-9]/.test(newPassword),
    matches:    newPassword.length > 0 && newPassword === confirmPassword,
  };
  const allRulesMet = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesMet) return;

    setLoading(true);
    setApiError("");

    try {
      await api.post("/api/auth/reset-password", { token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setApiError(
        err?.response?.data?.message || err?.message || "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="auth-bg min-h-screen flex relative overflow-hidden">
        <LeftPanel />

        {/* ============================================================ */}
        {/*  RIGHT PANEL                                                   */}
        {/* ============================================================ */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
          <div className="w-full max-w-[420px] bg-white/[0.03] lg:bg-white lg:dark:bg-[hsl(222,30%,10%)] backdrop-blur-xl lg:backdrop-blur-none rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/10 lg:border-gray-100 lg:dark:border-white/[0.08]">

            {/* ── No token error ───────────────────────────────────── */}
            {!token ? (
              <div className="fade-in-1 text-center">
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Invalid Reset Link
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This password reset link is invalid or has expired.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  Request a new link
                </Link>
                <div className="mt-6 pt-5 border-t border-gray-100 dark:border-white/[0.06]">
                  <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : success ? (
              /* ── Success state ────────────────────────────────────── */
              <div className="fade-in-1 text-center">
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                  Password changed!
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white btn-primary"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  Go to sign in
                </Link>
              </div>
            ) : (
              /* ── Reset form ───────────────────────────────────────── */
              <>
                {/* Heading */}
                <div className="fade-in-1 text-center mb-8">
                  <div className="flex justify-center mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg" style={{ background: "hsl(var(--primary))" }}>
                      EC
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                    Set New Password
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Choose a strong password for your account
                  </p>
                </div>

                {/* API error */}
                {apiError && (
                  <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    <X className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{apiError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New Password */}
                  <div className="fade-in-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      New Password
                    </label>
                    <div className="input-glow flex items-center gap-3 border border-gray-200 dark:border-white/[0.12] rounded-xl px-4 py-3 bg-gray-50/50 dark:bg-white/[0.04] transition-all duration-200">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((p) => !p)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label={showNew ? "Hide password" : "Show password"}
                      >
                        {showNew ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 dark:text-gray-500">Strength</span>
                          <span className={`text-xs font-medium ${strength.level === 1 ? "text-red-500" : strength.level === 2 ? "text-yellow-500" : "text-green-500"}`}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="fade-in-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="input-glow flex items-center gap-3 border border-gray-200 dark:border-white/[0.12] rounded-xl px-4 py-3 bg-gray-50/50 dark:bg-white/[0.04] transition-all duration-200">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                        className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((p) => !p)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {/* Password rules checklist */}
                  <div className="fade-in-3 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Password requirements</p>
                    <RuleRow met={rules.minLength} label="At least 8 characters" />
                    <RuleRow met={rules.hasUpper}  label="Contains uppercase letter" />
                    <RuleRow met={rules.hasNumber} label="Contains a number" />
                    <RuleRow met={rules.matches}   label="Passwords match" />
                  </div>

                  {/* Submit */}
                  <div className="fade-in-4 pt-1">
                    <button
                      type="submit"
                      disabled={loading || !allRulesMet}
                      className="btn-primary w-full flex items-center justify-center gap-2.5 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: "hsl(var(--primary))" }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Setting password...
                        </>
                      ) : (
                        "Set New Password"
                      )}
                    </button>
                  </div>
                </form>

                {/* Back to sign in */}
                <div className="fade-in-4 mt-6 pt-5 border-t border-gray-100 dark:border-white/[0.06]">
                  <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page export — wraps content in Suspense for Next.js 15 compatibility     */
/* -------------------------------------------------------------------------- */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
