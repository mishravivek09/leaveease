import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    doj: new Date().toISOString().slice(0, 10),
    deptId: "",
    roleId: "",
    managerId: "",
  });

  const loadData = async () => {
    try {
      const [uRes, rRes, dRes] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/roles"),
        API.get("/admin/departments"),
      ]);
      setUsers(uRes.data || []);
      setRoles(rRes.data || []);
      setDepartments(dRes.data || []);
      setForm((prev) => ({
        ...prev,
        deptId: prev.deptId || dRes.data?.[0]?._id || "",
        roleId: prev.roleId || rRes.data?.find((r) => r.roleName === "Employee")?._id || "",
      }));
    } catch {
      toast.error("Failed to load employees");
    }
  };

  useEffect(() => {
    Promise.all([
      API.get("/admin/users"),
      API.get("/admin/roles"),
      API.get("/admin/departments"),
    ])
      .then(([uRes, rRes, dRes]) => {
        setUsers(uRes.data || []);
        setRoles(rRes.data || []);
        setDepartments(dRes.data || []);
        setForm((prev) => ({
          ...prev,
          deptId: prev.deptId || dRes.data?.[0]?._id || "",
          roleId: prev.roleId || rRes.data?.find((r) => r.roleName === "Employee")?._id || "",
        }));
      })
      .catch(() => toast.error("Failed to load employees"));
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/admin/users/invite", {
        ...form,
        managerId: form.managerId || null,
      });
      setTempPasswordModal({
        email: res.data.employee.email,
        tempPassword: res.data.tempPassword,
      });
      setForm({ ...form, name: "", email: "", managerId: "" });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invite failed");
    }
  };

  const toggleActive = async (emp) => {
    try {
      await API.put(`/admin/users/${emp._id}`, { isActive: !emp.isActive });
      toast.success(`Employee ${emp.isActive ? "deactivated" : "activated"}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee record?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      toast.success("Employee deleted");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5">
          <h3 className="mb-4 font-semibold">Onboard / Invite Employee</h3>
          <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              type="date"
              value={form.doj}
              onChange={(e) => setForm({ ...form, doj: e.target.value })}
              required
            />
            <select
              value={form.deptId}
              onChange={(e) => setForm({ ...form, deptId: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              required
            >
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.deptName}</option>
              ))}
            </select>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              required
            >
              {roles.map((r) => (
                <option key={r._id} value={r._id}>{r.roleName}</option>
              ))}
            </select>
            <select
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">No Manager (Top-level)</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.roleId?.roleName})</option>
              ))}
            </select>
            <Button type="submit" className="sm:col-span-2 lg:col-span-3">
              Invite Employee
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Department</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Manager</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="py-3 pr-4">{u.deptId?.deptName || "N/A"}</td>
                  <td className="py-3 pr-4">{u.roleId?.roleName || "N/A"}</td>
                  <td className="py-3 pr-4">{u.managerId?.name || "-"}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={u.isActive ? "default" : "destructive"}>
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-3 text-right space-x-2">
                    {u._id !== currentUser?._id && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                          {u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(u._id)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md rounded-2xl">
            <CardContent className="space-y-4 p-6">
              <h3 className="font-semibold">Employee Invited</h3>
              <p className="text-sm text-muted-foreground">
                Share this temporary password with <strong>{tempPasswordModal.email}</strong>. It will not
                be shown again.
              </p>
              <div className="rounded-xl bg-muted p-3 font-mono text-sm">
                {tempPasswordModal.tempPassword}
              </div>
              <Button onClick={() => setTempPasswordModal(null)} className="w-full">
                Done
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
