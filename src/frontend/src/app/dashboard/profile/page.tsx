"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { FieldError } from "@/components/ui/field-error";
import {
  required,
  minLength,
  pattern,
  hasErrors,
  type ValidationError,
} from "@/lib/validators";
import api from "@/lib/api";
import {
  Camera,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Shield,
  Monitor,
  User,
  Lock,
  ChevronRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Password strength helper                                                  */
/* -------------------------------------------------------------------------- */
function getPasswordStrength(pwd: string): {
  label: string;
  color: string;
  width: string;
  level: number;
} {
  if (!pwd) return { label: "", color: "", width: "0%", level: 0 };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "33%", level: 1 };
  if (score <= 3) return { label: "Fair", color: "bg-yellow-500", width: "66%", level: 2 };
  return { label: "Strong", color: "bg-green-500", width: "100%", level: 3 };
}

/* -------------------------------------------------------------------------- */
/*  Tab type                                                                  */
/* -------------------------------------------------------------------------- */
type Tab = "profile" | "security";

/* -------------------------------------------------------------------------- */
/*  Profile Tab                                                               */
/* -------------------------------------------------------------------------- */
function ProfileTab() {
  const { user, updateUser } = useAuthStore();

  // Avatar state
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [errors, setErrors] = useState<ValidationError>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load stored avatar on mount
  useEffect(() => {
    if (user?.userId) {
      const stored = localStorage.getItem(`avatar_${user.userId}`);
      if (stored) setAvatarSrc(stored);
    }
  }, [user?.userId]);

  // Sync fullName if user changes
  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
  }, [user?.fullName]);

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPendingAvatar(result);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be picked again
    e.target.value = "";
  };

  const handleSavePhoto = async () => {
    if (!pendingAvatar || !user?.userId) return;
    setSavingPhoto(true);
    try {
      localStorage.setItem(`avatar_${user.userId}`, pendingAvatar);
      setAvatarSrc(pendingAvatar);
      setPendingAvatar(null);
      // Dispatch a storage event so the header updates without a reload
      window.dispatchEvent(new Event("storage"));
    } finally {
      setSavingPhoto(false);
    }
  };

  const validateForm = (): ValidationError => ({
    fullName: required(fullName, "Full name") || minLength(fullName, 2, "Full name"),
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      await api.patch("/api/auth/profile", { fullName });
      updateUser({ fullName });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message || err?.message || "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = pendingAvatar || avatarSrc;

  return (
    <div className="space-y-8">
      {/* ── Avatar section ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">Profile Photo</h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar circle */}
          <div className="relative group shrink-0">
            <div
              className="w-24 h-24 rounded-full overflow-hidden cursor-pointer ring-4 ring-border"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Change profile photo"
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={initials}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {initials}
                </div>
              )}

              {/* Camera overlay on hover */}
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              aria-hidden="true"
            />
          </div>

          {/* Info + actions */}
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click the photo to upload a new image
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium border border-border rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Choose Photo
              </button>

              {pendingAvatar && (
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={savingPhoto}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {savingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Save Photo
                </button>
              )}

              {pendingAvatar && (
                <button
                  type="button"
                  onClick={() => setPendingAvatar(null)}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              JPG, PNG or GIF up to 5MB
            </p>
          </div>
        </div>
      </div>

      {/* ── Profile info form ─────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">Account Information</h3>

        {/* Success banner */}
        {saveSuccess && (
          <div className="mb-5 flex items-center gap-3 p-3.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Profile updated successfully.
          </div>
        )}

        {/* Error banner */}
        {saveError && (
          <div className="mb-5 flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <XCircle className="w-4 h-4 shrink-0" />
            {saveError}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors((p) => ({ ...p, fullName: "" }));
                }}
                className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-foreground text-sm transition-colors"
                placeholder="Your full name"
              />
              <FieldError error={errors.fullName} />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full px-4 py-2.5 border border-input rounded-lg bg-muted text-muted-foreground text-sm cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Contact admin to change email
              </p>
            </div>

            {/* Role (read-only) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Role
              </label>
              <div className="flex items-center gap-2 px-4 py-2.5 border border-input rounded-lg bg-muted">
                <span className="inline-flex items-center text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
                  {user?.role || "—"}
                </span>
              </div>
            </div>

            {/* Tenant / Company (read-only) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Company
              </label>
              <input
                type="text"
                value={user?.tenantName || ""}
                readOnly
                className="w-full px-4 py-2.5 border border-input rounded-lg bg-muted text-muted-foreground text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm disabled:opacity-60 flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Security Tab                                                              */
/* -------------------------------------------------------------------------- */
function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<ValidationError>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [revoking, setRevoking] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const validatePassword = (): ValidationError => {
    const errs: ValidationError = {};
    errs.currentPassword = required(currentPassword, "Current password");
    errs.newPassword =
      required(newPassword, "New password") ||
      minLength(newPassword, 8, "New password") ||
      pattern(newPassword, /[A-Z]/, "New password", "must contain uppercase letter") ||
      pattern(newPassword, /[0-9]/, "New password", "must contain a number");
    errs.confirmPassword =
      required(confirmPassword, "Confirm password") ||
      (newPassword !== confirmPassword ? "Passwords do not match" : "");
    return errs;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validatePassword();
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setSuccessMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || err?.message || "Failed to change password"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeAll = async () => {
    setRevoking(true);
    try {
      await api.post("/api/auth/revoke-all");
      setRevokeSuccess(true);
    } catch {
      // silently fail for now
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Change Password card ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            <p className="text-xs text-muted-foreground">
              Use a strong password with at least 8 characters
            </p>
          </div>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="mb-5 flex items-center gap-3 p-3.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-green-700 dark:text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="mb-5 flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <XCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-5 max-w-md">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Current Password
            </label>
            <div className="flex items-center border border-input rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errors.currentPassword)
                    setErrors((p) => ({ ...p, currentPassword: "" }));
                }}
                className="flex-1 px-4 py-2.5 bg-background text-foreground text-sm outline-none"
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((p) => !p)}
                className="px-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError error={errors.currentPassword} />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              New Password
            </label>
            <div className="flex items-center border border-input rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors((p) => ({ ...p, newPassword: "" }));
                }}
                className="flex-1 px-4 py-2.5 bg-background text-foreground text-sm outline-none"
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((p) => !p)}
                className="px-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Password strength</span>
                  <span
                    className={`text-xs font-medium ${
                      strength.level === 1
                        ? "text-red-500"
                        : strength.level === 2
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
              </div>
            )}
            <FieldError error={errors.newPassword} />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Confirm New Password
            </label>
            <div className="flex items-center border border-input rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword)
                    setErrors((p) => ({ ...p, confirmPassword: "" }));
                }}
                className="flex-1 px-4 py-2.5 bg-background text-foreground text-sm outline-none"
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="px-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError error={errors.confirmPassword} />
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium text-sm disabled:opacity-60 flex items-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Change Password
            </button>
          </div>
        </form>
      </div>

      {/* ── Active Sessions card ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
            <p className="text-xs text-muted-foreground">
              Manage where you are currently signed in
            </p>
          </div>
        </div>

        {/* Current session row */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border mb-4">
          <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Current Session</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This device — Web browser
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Active now
          </span>
        </div>

        {/* Revoke all button */}
        {revokeSuccess ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            All other sessions have been signed out.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRevokeAll}
            disabled={revoking}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/5 transition-colors disabled:opacity-60"
          >
            {revoking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            Sign Out All Other Sessions
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */
export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Page heading */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account information and security settings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-7 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
            aria-selected={activeTab === tab.id}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "profile" ? <ProfileTab /> : <SecurityTab />}
    </div>
  );
}
