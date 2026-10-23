import axios from "axios";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, Check, KeyRound, Moon, ShieldCheck, Smartphone, Sun, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import {
  changePassword,
  updateProfile,
} from "../../services/auth";
import { updateUserProfile } from "../../services/users";
import type { ApiErrorResponse } from "../../types/api";
import "../../styles/auth.css";

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.error?.message;
    if (message) return message;
    if (!error.response) return "Unable to reach the API. Check your connection and try again.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read the selected image."));
    };
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(blob);
  });
}

async function prepareProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file for your profile photo.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 10 MB.");
  }

  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const size = 256;
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight, 1);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const compressed = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Your browser could not compress this image."));
        },
        "image/webp",
        0.78,
      );
    });
    const dataUrl = await readAsDataUrl(compressed);
    if (dataUrl.length > 80_000) {
      throw new Error("This image could not be compressed enough. Try a simpler photo.");
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "KES");
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(() => {
    const value = user?.financialPreferences.monthlySavingsTarget;
    return typeof value === "string" ? value : "";
  });
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(() => {
    const value = user?.financialPreferences.budgetAlertThreshold;
    return typeof value === "number" ? String(value) : "80";
  });
  const [budgetAlerts, setBudgetAlerts] = useState(
    user?.notificationPreferences.budgetAlerts !== false,
  );
  const [transactionAlerts, setTransactionAlerts] = useState(
    user?.notificationPreferences.transactionAlerts !== false,
  );
  const [goalUpdates, setGoalUpdates] = useState(
    user?.notificationPreferences.goalUpdates !== false,
  );
  const [monthlySummary, setMonthlySummary] = useState(
    user?.notificationPreferences.monthlySummary !== false,
  );
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto ?? null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      setProfilePhoto(await prepareProfilePhoto(file));
    } catch (error) {
      setProfileError(errorMessage(error));
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      if (monthlySavingsTarget && !/^\d+(?:\.\d{1,2})?$/.test(monthlySavingsTarget)) {
        throw new Error("Enter a valid savings target with up to two decimal places.");
      }

      const financialPreferences = { ...user?.financialPreferences };
      if (monthlySavingsTarget) {
        financialPreferences.monthlySavingsTarget = monthlySavingsTarget;
      } else {
        delete financialPreferences.monthlySavingsTarget;
      }
      financialPreferences.budgetAlertThreshold = Number(budgetAlertThreshold);

      const notificationPreferences = {
        ...user?.notificationPreferences,
        budgetAlerts,
        transactionAlerts,
        goalUpdates,
        monthlySummary,
      };
      const updatedUser = await updateUserProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        currency,
        financialPreferences,
        notificationPreferences,
      });
      updateUser(updatedUser);

      if (updatedUser.profilePhoto !== profilePhoto) {
        try {
          const updatedPhotoUser = await updateProfile({ profilePhoto });
          updateUser(updatedPhotoUser);
        } catch (error) {
          throw new Error(
            `Account details were saved, but the profile photo was not: ${errorMessage(error)}`,
            { cause: error },
          );
        }
      }
      setProfileSuccess("Profile details saved.");
    } catch (error) {
      setProfileError(errorMessage(error));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleThemeChange(themePreference: "LIGHT" | "DARK") {
    if (!user || themePreference === user.themePreference || themeSaving) return;
    setThemeSaving(true);
    setThemeError(null);
    try {
      const updatedUser = await updateProfile({ themePreference });
      updateUser(updatedUser);
    } catch (error) {
      setThemeError(errorMessage(error));
    } finally {
      setThemeSaving(false);
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("The new password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword: password, newPassword });
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password updated successfully.");
    } catch (error) {
      setPasswordError(errorMessage(error));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <section className="settings-page">
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h1>Account settings</h1>
          <p>Manage your personal details, financial preferences, notifications, security, and appearance.</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="dashboard-card settings-card">
          <div className="settings-card-heading">
            <span className="settings-icon"><UserRound size={18} /></span>
            <div>
              <h2>Profile</h2>
              <p>Personalize how your account appears.</p>
            </div>
          </div>
          <form className="settings-form" onSubmit={(event) => void handleProfileSave(event)}>
            <div className="profile-photo-control">
              <div className="profile-photo-preview" aria-label="Profile photo preview">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Your profile" />
                ) : (
                  <span>{user?.fullName.slice(0, 1).toUpperCase() ?? "U"}</span>
                )}
              </div>
              <div>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={photoLoading || profileSaving}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera size={15} /> {photoLoading ? "Preparing photo…" : "Choose photo"}
                </button>
                {profilePhoto && (
                  <button
                    className="settings-text-button"
                    type="button"
                    disabled={profileSaving}
                    onClick={() => {
                      setProfilePhoto(null);
                      setProfileSuccess(null);
                    }}
                  >
                    Remove photo
                  </button>
                )}
                <input
                  ref={photoInputRef}
                  className="settings-file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Choose a profile photo"
                  onChange={(event) => void handlePhotoChange(event)}
                />
                <small>PNG, JPG, or WebP. The image is resized before it is saved.</small>
              </div>
            </div>

            <label className="auth-field">
              Full name
              <input
                value={fullName}
                minLength={2}
                maxLength={120}
                required
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <label className="auth-field">
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                maxLength={254}
                required
                onChange={(event) => setEmail(event.target.value)}
              />
              <small>Use your updated email the next time you sign in.</small>
            </label>
            <label className="auth-field">
              Phone number
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                maxLength={32}
                placeholder="+254 700 000000"
                onChange={(event) => setPhone(event.target.value)}
              />
              <small>Optional. Include your country code when possible.</small>
            </label>
            <label className="auth-field">
              Preferred currency
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {[
                  ["KES", "KES — Kenyan shilling"],
                  ["USD", "USD — US dollar"],
                  ["EUR", "EUR — Euro"],
                  ["GBP", "GBP — Pound sterling"],
                  ["TZS", "TZS — Tanzanian shilling"],
                  ["UGX", "UGX — Ugandan shilling"],
                ].map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
              <small>New accounts default to KES. Changing this preference does not convert existing records; transaction totals are currently shown in KES.</small>
            </label>

            <div className="settings-subsection">
              <h3>Financial preferences</h3>
              <p>Set optional targets and the budget warning point for your account.</p>
              <label className="auth-field">
                Monthly savings target (KES)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlySavingsTarget}
                  onChange={(event) => setMonthlySavingsTarget(event.target.value)}
                  placeholder="e.g. 5000"
                />
              </label>
              <label className="auth-field">
                Budget warning threshold
                <select
                  value={budgetAlertThreshold}
                  onChange={(event) => setBudgetAlertThreshold(event.target.value)}
                >
                  {[50, 60, 70, 75, 80, 90, 100].map((threshold) => (
                    <option key={threshold} value={threshold}>{threshold}% of budget</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="settings-subsection">
              <h3>Notification preferences</h3>
              <p>Choose the types of account alerts you prefer.</p>
              <div className="settings-checkbox-list">
                <label><input type="checkbox" checked={budgetAlerts} onChange={(event) => setBudgetAlerts(event.target.checked)} /> Budget alerts</label>
                <label><input type="checkbox" checked={transactionAlerts} onChange={(event) => setTransactionAlerts(event.target.checked)} /> Transaction updates</label>
                <label><input type="checkbox" checked={goalUpdates} onChange={(event) => setGoalUpdates(event.target.checked)} /> Savings goal updates</label>
                <label><input type="checkbox" checked={monthlySummary} onChange={(event) => setMonthlySummary(event.target.checked)} /> Monthly summary</label>
              </div>
              <small className="settings-note">These preferences are saved to your account. Notification delivery is not enabled yet.</small>
            </div>

            {profileError && <p className="auth-error" role="alert">{profileError}</p>}
            {profileSuccess && <p className="settings-success" role="status"><Check size={15} /> {profileSuccess}</p>}
            <button className="button button-primary" type="submit" disabled={profileSaving || photoLoading}>
              {profileSaving ? "Saving profile…" : "Save profile"}
            </button>
          </form>
        </section>

        <section className="dashboard-card settings-card">
          <div className="settings-card-heading">
            <span className="settings-icon"><Sun size={18} /></span>
            <div>
              <h2>Appearance</h2>
              <p>Your preference is saved to your account and follows you across devices.</p>
            </div>
          </div>
          <div className="theme-options" role="group" aria-label="Color theme">
            <button
              className={user?.themePreference === "LIGHT" ? "theme-option selected" : "theme-option"}
              type="button"
              aria-pressed={user?.themePreference === "LIGHT"}
              disabled={themeSaving}
              onClick={() => void handleThemeChange("LIGHT")}
            >
              <Sun size={19} />
              <span>Light</span>
              {user?.themePreference === "LIGHT" && <Check size={16} />}
            </button>
            <button
              className={user?.themePreference === "DARK" ? "theme-option selected" : "theme-option"}
              type="button"
              aria-pressed={user?.themePreference === "DARK"}
              disabled={themeSaving}
              onClick={() => void handleThemeChange("DARK")}
            >
              <Moon size={19} />
              <span>Dark</span>
              {user?.themePreference === "DARK" && <Check size={16} />}
            </button>
          </div>
          {themeSaving && <p className="settings-note" role="status">Saving appearance preference…</p>}
          {themeError && <p className="auth-error" role="alert">{themeError}</p>}
        </section>

        <section className="dashboard-card settings-card">
          <div className="settings-card-heading">
            <span className="settings-icon"><KeyRound size={18} /></span>
            <div>
              <h2>Change password</h2>
              <p>Use your current password to set a new one.</p>
            </div>
          </div>
          <form className="settings-form" onSubmit={(event) => void handlePasswordChange(event)}>
            <label className="auth-field">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                minLength={1}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="auth-field">
              New password
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <small>Use at least 12 characters.</small>
            </label>
            <label className="auth-field">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            {passwordError && <p className="auth-error" role="alert">{passwordError}</p>}
            {passwordSuccess && <p className="settings-success" role="status"><Check size={15} /> {passwordSuccess}</p>}
            <button className="button button-primary" type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Updating password…" : "Update password"}
            </button>
          </form>
        </section>

        <section className="dashboard-card settings-card integrations-card">
          <div className="settings-card-heading">
            <span className="settings-icon"><Smartphone size={18} /></span>
            <div>
              <h2>External account syncing</h2>
              <p>M-Pesa statement import is ready. Direct automatic syncing is not connected.</p>
            </div>
          </div>
          <div className="mpesa-import-panel">
            <span className="mpesa-import-icon"><ShieldCheck size={19} /></span>
            <div className="mpesa-import-copy">
              <strong>Personal M-Pesa wallet</strong>
              <p>Import a statement CSV or PDF. PDFs are read locally in your browser, and nothing is saved until you review and confirm the selected transactions.</p>
            </div>
            <Link className="button button-primary mpesa-import-action" to="/app/imports?provider=mpesa">
              Import M-Pesa statement
            </Link>
          </div>
          <p className="settings-note integration-future-note">
            No M-Pesa PIN, password, or provider API secret is requested or stored. Bank syncing, business Till/Paybill connections, PayPal, and Bitcoin integrations are not connected.
          </p>
        </section>
      </div>
    </section>
  );
}
