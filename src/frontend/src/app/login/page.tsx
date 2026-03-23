"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Mail, Lock, Eye, EyeOff, Loader2, X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Inline CSS for animations & 3D scene                                      */
/* -------------------------------------------------------------------------- */
const styles = `
/* ── Animated gradient background ───────────────────────────────────────── */
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.login-bg {
  background: linear-gradient(-45deg, hsl(230 45% 8%), hsl(250 40% 12%), hsl(220 50% 10%), hsl(240 35% 14%));
  background-size: 400% 400%;
  animation: gradientShift 20s ease infinite;
}

/* ── 3D Scene container ─────────────────────────────────────────────────── */
.scene-3d {
  perspective: 1200px;
  transform-style: preserve-3d;
}

/* ── Rotating platform ──────────────────────────────────────────────────── */
@keyframes rotatePlatform {
  0%   { transform: rotateX(15deg) rotateY(0deg); }
  100% { transform: rotateX(15deg) rotateY(360deg); }
}
.platform {
  transform-style: preserve-3d;
  animation: rotatePlatform 30s linear infinite;
}

/* ── Floating cubes (ERP modules) ───────────────────────────────────────── */
@keyframes floatCube {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-18px); }
}
.cube-container {
  transform-style: preserve-3d;
}
.cube {
  transform-style: preserve-3d;
  animation: floatCube 4s ease-in-out infinite;
}
.cube-face {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.cube-face.front  { transform: translateZ(40px); }
.cube-face.back   { transform: rotateY(180deg) translateZ(40px); }
.cube-face.right  { transform: rotateY(90deg) translateZ(40px); }
.cube-face.left   { transform: rotateY(-90deg) translateZ(40px); }
.cube-face.top    { transform: rotateX(90deg) translateZ(40px); }
.cube-face.bottom { transform: rotateX(-90deg) translateZ(40px); }

/* ── Orbiting ring ──────────────────────────────────────────────────────── */
@keyframes orbitRing {
  0%   { transform: rotateX(70deg) rotateZ(0deg); }
  100% { transform: rotateX(70deg) rotateZ(360deg); }
}
.orbit-ring {
  border: 2px solid hsl(var(--primary) / 0.2);
  border-radius: 50%;
  animation: orbitRing 12s linear infinite;
  transform-style: preserve-3d;
}
.orbit-ring-2 {
  border: 1.5px dashed hsl(var(--primary) / 0.12);
  border-radius: 50%;
  animation: orbitRing 18s linear infinite reverse;
  transform-style: preserve-3d;
}

/* ── Orbit dots ─────────────────────────────────────────────────────────── */
@keyframes orbitDot {
  0%   { transform: rotate(0deg) translateX(120px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
}
@keyframes orbitDot2 {
  0%   { transform: rotate(0deg) translateX(160px) rotate(0deg); }
  100% { transform: rotate(-360deg) translateX(160px) rotate(360deg); }
}
.orbit-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -4px;
  background: hsl(var(--primary));
  box-shadow: 0 0 12px hsl(var(--primary) / 0.6);
  animation: orbitDot 8s linear infinite;
}
.orbit-dot-2 {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -3px;
  background: hsl(var(--primary) / 0.7);
  box-shadow: 0 0 10px hsl(var(--primary) / 0.4);
  animation: orbitDot2 14s linear infinite;
}

/* ── Grid floor ─────────────────────────────────────────────────────────── */
@keyframes gridPulse {
  0%, 100% { opacity: 0.08; }
  50%      { opacity: 0.15; }
}
.grid-floor {
  background-image:
    linear-gradient(hsl(var(--primary) / 0.15) 1px, transparent 1px),
    linear-gradient(90deg, hsl(var(--primary) / 0.15) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridPulse 6s ease-in-out infinite;
}

/* ── Glowing center sphere ──────────────────────────────────────────────── */
@keyframes spherePulse {
  0%, 100% { box-shadow: 0 0 30px hsl(var(--primary) / 0.3), 0 0 60px hsl(var(--primary) / 0.15); transform: scale(1); }
  50%      { box-shadow: 0 0 45px hsl(var(--primary) / 0.5), 0 0 90px hsl(var(--primary) / 0.25); transform: scale(1.08); }
}
.center-sphere {
  animation: spherePulse 4s ease-in-out infinite;
  background: radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.4));
}

/* ── Connection lines ───────────────────────────────────────────────────── */
@keyframes linePulse {
  0%, 100% { opacity: 0.15; }
  50%      { opacity: 0.4; }
}
.conn-line {
  background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent);
  animation: linePulse 3s ease-in-out infinite;
}

/* ── Staggered fade-in ──────────────────────────────────────────────────── */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in-1 { animation: fadeInUp 0.5s ease-out 0.1s both; }
.fade-in-2 { animation: fadeInUp 0.5s ease-out 0.25s both; }
.fade-in-3 { animation: fadeInUp 0.5s ease-out 0.4s both; }
.fade-in-4 { animation: fadeInUp 0.5s ease-out 0.55s both; }

/* ── Shake on error ─────────────────────────────────────────────────────── */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}
.shake { animation: shake 0.5s ease-in-out; }

/* ── Success flash ──────────────────────────────────────────────────────── */
@keyframes successFlash {
  0%   { box-shadow: 0 0 0 0 hsl(142 71% 45% / 0.5); }
  50%  { box-shadow: 0 0 0 8px hsl(142 71% 45% / 0.15); }
  100% { box-shadow: 0 0 0 0 hsl(142 71% 45% / 0); }
}
.success-flash { animation: successFlash 0.6s ease-out; border-color: hsl(142 71% 45%) !important; }

/* ── Input focus glow ───────────────────────────────────────────────────── */
.input-glow:focus-within {
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15);
  border-color: hsl(var(--primary));
}

/* ── Button hover ───────────────────────────────────────────────────────── */
.btn-primary { transition: all 0.2s ease; }
.btn-primary:hover:not(:disabled) { transform: scale(1.015); box-shadow: 0 4px 20px hsl(var(--primary) / 0.4); }
.btn-primary:active:not(:disabled) { transform: scale(0.985); }

/* ── Left panel entrance ────────────────────────────────────────────────── */
@keyframes panelSlideIn {
  from { opacity: 0; transform: translateX(-30px); }
  to   { opacity: 1; transform: translateX(0); }
}
.panel-fade { animation: panelSlideIn 0.8s ease-out 0.2s both; }

/* ── Label text ─────────────────────────────────────────────────────────── */
@keyframes labelFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
.erp-label {
  animation: labelFloat 5s ease-in-out infinite;
}
`;

/* -------------------------------------------------------------------------- */
/*  3D ERP Module cubes data                                                  */
/* -------------------------------------------------------------------------- */
const erpModules = [
  { name: "Inventory", color: "rgba(59, 130, 246, 0.25)", textColor: "#60a5fa", x: -100, y: -60, z: 30, delay: "0s" },
  { name: "Billing", color: "rgba(16, 185, 129, 0.25)", textColor: "#34d399", x: 100, y: -50, z: -20, delay: "0.7s" },
  { name: "Orders", color: "rgba(245, 158, 11, 0.25)", textColor: "#fbbf24", x: -80, y: 70, z: -30, delay: "1.4s" },
  { name: "Warehouse", color: "rgba(139, 92, 246, 0.25)", textColor: "#a78bfa", x: 90, y: 60, z: 40, delay: "2.1s" },
  { name: "Reports", color: "rgba(236, 72, 153, 0.25)", textColor: "#f472b6", x: 0, y: -100, z: 0, delay: "2.8s" },
  { name: "Production", color: "rgba(20, 184, 166, 0.25)", textColor: "#2dd4bf", x: 0, y: 100, z: 10, delay: "3.5s" },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [success, setSuccess] = useState(false);

  const { login } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("rememberedEmail");
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setShaking(false);

    try {
      await login(email, password);
      if (rememberMe) localStorage.setItem("rememberedEmail", email);
      else localStorage.removeItem("rememberedEmail");
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Invalid email or password");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="login-bg min-h-screen flex relative overflow-hidden">

        {/* ================================================================ */}
        {/*  LEFT PANEL — 3D ERP Animation                                   */}
        {/* ================================================================ */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] items-center justify-center relative panel-fade">

          {/* Grid floor effect */}
          <div className="absolute inset-0 grid-floor" style={{ transform: "perspective(600px) rotateX(60deg)", transformOrigin: "center bottom" }} />

          {/* 3D Scene */}
          <div className="scene-3d relative" style={{ width: 420, height: 420 }}>

            {/* Orbit rings */}
            <div className="orbit-ring absolute" style={{ width: 280, height: 280, top: "50%", left: "50%", marginTop: -140, marginLeft: -140 }} />
            <div className="orbit-ring-2 absolute" style={{ width: 360, height: 360, top: "50%", left: "50%", marginTop: -180, marginLeft: -180 }} />

            {/* Orbit dots */}
            <div className="orbit-dot" />
            <div className="orbit-dot-2" />

            {/* Center sphere with ERP text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="center-sphere w-20 h-20 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg tracking-wider">ERP</span>
              </div>
            </div>

            {/* Rotating platform with ERP module cubes */}
            <div className="platform absolute inset-0">
              {erpModules.map((mod) => (
                <div
                  key={mod.name}
                  className="cube-container absolute"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) translate3d(${mod.x}px, ${mod.y}px, ${mod.z}px)`,
                  }}
                >
                  <div
                    className="cube relative"
                    style={{ width: 80, height: 80, animationDelay: mod.delay }}
                  >
                    <div className="cube-face front" style={{ background: mod.color, color: mod.textColor }}>
                      {mod.name}
                    </div>
                    <div className="cube-face back" style={{ background: mod.color, color: mod.textColor }}>
                      {mod.name}
                    </div>
                    <div className="cube-face right" style={{ background: mod.color }} />
                    <div className="cube-face left" style={{ background: mod.color }} />
                    <div className="cube-face top" style={{ background: `${mod.color.replace("0.25", "0.35")}` }} />
                    <div className="cube-face bottom" style={{ background: `${mod.color.replace("0.25", "0.1")}` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Connection lines from center to modules */}
            {erpModules.map((mod, i) => {
              const angle = Math.atan2(mod.y, mod.x);
              const dist = Math.sqrt(mod.x * mod.x + mod.y * mod.y);
              return (
                <div
                  key={`line-${i}`}
                  className="conn-line absolute"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: dist * 0.6,
                    height: 1,
                    transformOrigin: "0 50%",
                    transform: `rotate(${angle}rad)`,
                    animationDelay: `${i * 0.5}s`,
                  }}
                />
              );
            })}
          </div>

          {/* Title below the 3D scene */}
          <div className="absolute bottom-12 left-0 right-0 text-center">
            <div className="erp-label inline-block">
              <h2 className="text-2xl font-bold text-white/90 tracking-tight">
                EL CURIO <span className="text-white/40 font-normal">|</span>{" "}
                <span style={{ color: "hsl(var(--primary))" }}>RetailERP</span>
              </h2>
              <p className="mt-2 text-sm text-white/40 max-w-sm mx-auto">
                Enterprise-grade platform for footwear, bags &amp; belts distribution — inventory, billing, and analytics unified.
              </p>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/*  RIGHT PANEL — Login Form                                        */}
        {/* ================================================================ */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative z-10">
          <div
            className={`
              w-full max-w-[420px]
              bg-white/[0.03] lg:bg-white lg:dark:bg-[hsl(222,30%,10%)]
              backdrop-blur-xl lg:backdrop-blur-none
              rounded-2xl shadow-2xl
              p-8 sm:p-10
              border border-white/10 lg:border-gray-100 lg:dark:border-white/[0.08]
              ${shaking ? "shake" : ""}
              ${success ? "success-flash" : ""}
            `}
          >
            {/* Logo + Heading */}
            <div className="fade-in-1 text-center mb-8">
              <div className="flex justify-center mb-5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  EC
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Sign in to your RetailERP account
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <X className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="fade-in-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email address
                </label>
                <div className="input-glow flex items-center gap-3 border border-gray-200 dark:border-white/[0.12] rounded-xl px-4 py-3 bg-gray-50/50 dark:bg-white/[0.04] transition-all duration-200">
                  <Mail className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500 shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="fade-in-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="input-glow flex items-center gap-3 border border-gray-200 dark:border-white/[0.12] rounded-xl px-4 py-3 bg-gray-50/50 dark:bg-white/[0.04] transition-all duration-200">
                  <Lock className="w-[18px] h-[18px] text-gray-400 dark:text-gray-500 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div className="fade-in-3 flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 peer-checked:border-[hsl(var(--primary))] peer-checked:bg-[hsl(var(--primary))] transition-all duration-200 flex items-center justify-center">
                      {rememberMe && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium hover:underline transition-colors"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <div className="fade-in-4 pt-1">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="btn-primary w-full flex items-center justify-center gap-2.5 text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in...
                    </>
                  ) : success ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8l4 4 6-6" />
                      </svg>
                      Success
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="fade-in-4 mt-8 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Powered by <span className="font-semibold" style={{ color: "hsl(var(--primary))" }}>Shalive Solutions</span> RetailERP
              </p>
              <p className="text-center text-xs text-gray-300 dark:text-gray-600 mt-1">
                &copy; {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
