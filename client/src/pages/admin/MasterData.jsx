import { useEffect, useState } from "react";
import API from "@/lib/api";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MasterData() {
  const [tab, setTab] = useState("departments");
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [deptForm, setDeptForm] = useState({
    deptName: "",
    approvalMode: "single",
    hrApproverId: "",
    weeklyOffs: [0, 6],
  });
  const [ltForm, setLtForm] = useState({
    typeName: "",
    maxDaysPerYear: 12,
    carryForwardAllowed: false,
    maxCarryForwardDays: 0,
  });
  const [holidayForm, setHolidayForm] = useState({
    holidayDate: "",
    description: "",
    isOptional: false,
  });

  const currentYear = new Date().getUTCFullYear();
  const [cfYears, setCfYears] = useState({ fromYear: currentYear - 1, toYear: currentYear });

  const loadAll = async () => {
    try {
      const [d, lt, h, u] = await Promise.all([
        API.get("/admin/departments"),
        API.get("/admin/leave-types"),
        API.get("/admin/holidays"),
        API.get("/admin/users"),
      ]);
      setDepartments(d.data || []);
      setLeaveTypes(lt.data || []);
      setHolidays(h.data || []);
      setEmployees(u.data || []);
    } catch {
      toast.error("Failed to load master data");
    }
  };

  useEffect(() => {
    Promise.all([
      API.get("/admin/departments"),
      API.get("/admin/leave-types"),
      API.get("/admin/holidays"),
      API.get("/admin/users"),
    ])
      .then(([d, lt, h, u]) => {
        setDepartments(d.data || []);
        setLeaveTypes(lt.data || []);
        setHolidays(h.data || []);
        setEmployees(u.data || []);
      })
      .catch(() => toast.error("Failed to load master data"));
  }, []);

  const toggleWeeklyOff = (day) => {
    setDeptForm((prev) => ({
      ...prev,
      weeklyOffs: prev.weeklyOffs.includes(day)
        ? prev.weeklyOffs.filter((d) => d !== day)
        : [...prev.weeklyOffs, day].sort(),
    }));
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await API.post("/admin/departments", {
        ...deptForm,
        hrApproverId: deptForm.hrApproverId || null,
      });
      toast.success("Department created");
      setDeptForm({ deptName: "", approvalMode: "single", hrApproverId: "", weeklyOffs: [0, 6] });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create department");
    }
  };

  const handleCreateLeaveType = async (e) => {
    e.preventDefault();
    try {
      await API.post("/admin/leave-types", {
        ...ltForm,
        maxDaysPerYear: Number(ltForm.maxDaysPerYear),
        maxCarryForwardDays: Number(ltForm.maxCarryForwardDays),
      });
      toast.success("Leave type created");
      setLtForm({ typeName: "", maxDaysPerYear: 12, carryForwardAllowed: false, maxCarryForwardDays: 0 });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create leave type");
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    try {
      await API.post("/admin/holidays", holidayForm);
      toast.success("Holiday added");
      setHolidayForm({ holidayDate: "", description: "", isOptional: false });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add holiday");
    }
  };

  const handleCarryForward = async () => {
    if (!window.confirm(`Run year-end carry-forward from ${cfYears.fromYear} to ${cfYears.toYear}?`)) {
      return;
    }
    try {
      const res = await API.post("/admin/carry-forward", cfYears);
      toast.success(
        `Carry-forward complete: ${res.data.processedCount} updated, ${res.data.skippedCount} skipped`
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Carry-forward failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "departments", label: "Departments" },
          { key: "leave-types", label: "Leave Types" },
          { key: "holidays", label: "Holidays" },
          { key: "carry-forward", label: "Year-End Carry-Forward" },
        ].map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "departments" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold">Add Department</h3>
              <form onSubmit={handleCreateDept} className="space-y-4">
                <Input
                  placeholder="Department Name (e.g. Finance)"
                  value={deptForm.deptName}
                  onChange={(e) => setDeptForm({ ...deptForm, deptName: e.target.value })}
                  required
                />
                <select
                  value={deptForm.approvalMode}
                  onChange={(e) => setDeptForm({ ...deptForm, approvalMode: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="single">Single-level (Manager/HR)</option>
                  <option value="multi">Multi-level (Manager → HR)</option>
                </select>
                <select
                  value={deptForm.hrApproverId}
                  onChange={(e) => setDeptForm({ ...deptForm, hrApproverId: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select HR Approver (required for multi)</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.roleId?.roleName})
                    </option>
                  ))}
                </select>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Weekly Offs</p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d, idx) => (
                      <label key={d} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={deptForm.weeklyOffs.includes(idx)}
                          onChange={() => toggleWeeklyOff(idx)}
                        />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Department</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5 space-y-2.5">
              <h3 className="mb-3 font-semibold">Existing Departments</h3>
              {departments.map((d) => (
                <div key={d._id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{d.deptName}</p>
                    <p className="text-xs text-muted-foreground">
                      Mode: {d.approvalMode} • HR: {d.hrApproverId?.name || "None"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await API.delete(`/admin/departments/${d._id}`);
                        toast.success("Department deleted");
                        loadAll();
                      } catch (err) {
                        toast.error(err.response?.data?.message || "Delete failed");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "leave-types" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold">Add Leave Type</h3>
              <form onSubmit={handleCreateLeaveType} className="space-y-4">
                <Input
                  placeholder="Type Name (e.g. Paternity)"
                  value={ltForm.typeName}
                  onChange={(e) => setLtForm({ ...ltForm, typeName: e.target.value })}
                  required
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Max Days Per Year"
                  value={ltForm.maxDaysPerYear}
                  onChange={(e) => setLtForm({ ...ltForm, maxDaysPerYear: e.target.value })}
                  required
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={ltForm.carryForwardAllowed}
                    onChange={(e) => setLtForm({ ...ltForm, carryForwardAllowed: e.target.checked })}
                  />
                  Allow Year-End Carry-Forward
                </label>
                {ltForm.carryForwardAllowed && (
                  <Input
                    type="number"
                    min={0}
                    placeholder="Max Carry-Forward Days"
                    value={ltForm.maxCarryForwardDays}
                    onChange={(e) => setLtForm({ ...ltForm, maxCarryForwardDays: e.target.value })}
                  />
                )}
                <Button type="submit" className="w-full">Create Leave Type</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5 space-y-2.5">
              <h3 className="mb-3 font-semibold">Configured Leave Types</h3>
              {leaveTypes.map((lt) => (
                <div key={lt._id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{lt.typeName}</p>
                    <p className="text-xs text-muted-foreground">
                      Max/Year: {lt.maxDaysPerYear} • Carry-Forward:{" "}
                      {lt.carryForwardAllowed ? `Yes (up to ${lt.maxCarryForwardDays})` : "No"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await API.delete(`/admin/leave-types/${lt._id}`);
                      toast.success("Leave type deleted");
                      loadAll();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "holidays" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold">Add Public Holiday</h3>
              <form onSubmit={handleCreateHoliday} className="space-y-4">
                <Input
                  type="date"
                  value={holidayForm.holidayDate}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayDate: e.target.value })}
                  required
                />
                <Input
                  placeholder="Holiday Description"
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                  required
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={holidayForm.isOptional}
                    onChange={(e) => setHolidayForm({ ...holidayForm, isOptional: e.target.checked })}
                  />
                  Optional Holiday (not excluded from working days)
                </label>
                <Button type="submit" className="w-full">Add Holiday</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-5 space-y-2.5">
              <h3 className="mb-3 font-semibold">Holiday Calendar</h3>
              {holidays.map((h) => (
                <div key={h._id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{h.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.holidayDate).toISOString().slice(0, 10)} •{" "}
                      {h.isOptional ? "Optional" : "Mandatory"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await API.delete(`/admin/holidays/${h._id}`);
                      toast.success("Holiday deleted");
                      loadAll();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "carry-forward" && (
        <Card className="max-w-lg rounded-2xl">
          <CardContent className="space-y-4 p-6">
            <h3 className="font-semibold">Year-End Leave Balance Carry-Forward</h3>
            <p className="text-sm text-muted-foreground">
              Rolls unused remaining days (up to each leave type&apos;s configured cap) for all active
              employees where carry-forward is enabled. Idempotent per employee, leave type, and target year.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">From Year</label>
                <Input
                  type="number"
                  value={cfYears.fromYear}
                  onChange={(e) => setCfYears({ ...cfYears, fromYear: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs font-medium">To Year</label>
                <Input
                  type="number"
                  value={cfYears.toYear}
                  onChange={(e) => setCfYears({ ...cfYears, toYear: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button onClick={handleCarryForward} className="w-full">
              Execute Year-End Carry-Forward
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
