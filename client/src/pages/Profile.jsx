import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { toast } from "react-toastify";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Shield } from "lucide-react";

export default function Profile() {
  const { user, roleName, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState(user?.mustChangePassword ? "security" : "profile");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [errors, setErrors] = useState({});

  const validateProfile = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    return newErrors;
  };

  const validatePassword = () => {
    const newErrors = {};
    if (!passwords.currentPassword) newErrors.currentPassword = "Current password is required";
    if (!passwords.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwords.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    return newErrors;
  };

  const handleUpdateProfile = async () => {
    const validationErrors = validateProfile();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await API.put("/users/me", { name, email });
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const validationErrors = validatePassword();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await API.put("/users/change-password", passwords);
      await refreshUser();
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {user?.mustChangePassword && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-300">
          You must change your temporary password before accessing other pages.
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full space-y-2 md:w-56">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
              activeTab === "profile" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <User size={16} />
            Profile Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
              activeTab === "security" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            <Shield size={16} />
            Security
          </button>
        </div>

        <div className="flex-1">
          {activeTab === "profile" && (
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-11 rounded-xl"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-11 rounded-xl"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Role</label>
                    <Input value={roleName || ""} disabled className="mt-1 h-11 rounded-xl bg-muted" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Department</label>
                    <Input
                      value={user?.deptId?.deptName || "N/A"}
                      disabled
                      className="mt-1 h-11 rounded-xl bg-muted"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={handleUpdateProfile} disabled={loading} className="h-11 rounded-xl px-6">
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="rounded-2xl border shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Current Password</label>
                  <Input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    className="mt-1 h-11 rounded-xl"
                  />
                  {errors.currentPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-muted-foreground">
                    New Password (min 8 characters)
                  </label>
                  <Input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    className="mt-1 h-11 rounded-xl"
                  />
                  {errors.newPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.newPassword}</p>
                  )}
                </div>

                <div className="pt-2">
                  <Button onClick={handleChangePassword} disabled={loading} className="h-11 rounded-xl px-6">
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
