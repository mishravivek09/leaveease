import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ApplyLeave() {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [ltRes, balRes] = await Promise.all([
          API.get("/admin/leave-types"),
          API.get("/users/my-balances"),
        ]);
        const activeTypes = (ltRes.data || []).filter((t) => t.isActive);
        setLeaveTypes(activeTypes);
        setBalances(balRes.data || []);
        if (activeTypes.length > 0) {
          setLeaveTypeId(activeTypes[0]._id);
        }
      } catch {
        toast.error("Failed to load leave types or balances");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) {
      setPreview(null);
      return;
    }
    const fetchPreview = async () => {
      try {
        const res = await API.get(
          `/leave/preview-days?startDate=${startDate}&endDate=${endDate}`
        );
        setPreview(res.data);
      } catch {
        setPreview(null);
      }
    };
    fetchPreview();
  }, [startDate, endDate]);

  const selectedBalance = balances.find((b) => b.leaveTypeId?._id === leaveTypeId);
  const remaining = selectedBalance?.remaining ?? 0;
  const insufficient = preview && preview.noOfDays > remaining;
  const zeroDays = preview && preview.noOfDays === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (zeroDays) {
      toast.error("Selected range contains zero working days");
      return;
    }
    if (insufficient) {
      toast.error("Insufficient leave balance");
      return;
    }

    setSubmitting(true);
    try {
      await API.post("/leave", { leaveTypeId, startDate, endDate, reason });
      toast.success("Leave application submitted");
      navigate("/track-leaves");
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-6">
          <h2 className="mb-4 text-lg font-semibold">New Leave Application</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium">Leave Type</label>
              <select
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                required
              >
                {leaveTypes.map((lt) => (
                  <option key={lt._id} value={lt._id}>
                    {lt.typeName} (Max {lt.maxDaysPerYear}/yr)
                  </option>
                ))}
              </select>
              {selectedBalance && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Available balance: <span className="font-semibold text-primary">{remaining}</span> day(s)
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="mt-1.5 rounded-xl"
                  required
                />
              </div>
            </div>

            {preview && (
              <div
                className={`rounded-xl border p-3 text-sm ${
                  zeroDays || insufficient
                    ? "border-red-500/40 bg-red-500/10 text-red-500"
                    : "border-primary/30 bg-primary/5"
                }`}
              >
                <p className="font-medium">
                  Working Days Requested: {preview.noOfDays}
                </p>
                <p className="mt-0.5 text-xs opacity-80">
                  Excluded weekends: {preview.excludedWeekends} • Excluded public holidays:{" "}
                  {preview.excludedHolidays}
                </p>
                {zeroDays && <p className="mt-1 text-xs">Cannot apply for 0 working days.</p>}
                {insufficient && (
                  <p className="mt-1 text-xs">Requested days exceed available balance ({remaining}).</p>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Reason</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a brief reason for your leave..."
                className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || zeroDays || insufficient}
              className="h-11 w-full rounded-xl"
            >
              {submitting ? "Submitting..." : "Submit Leave Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
