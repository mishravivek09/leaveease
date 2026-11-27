import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TrackLeave() {
  const { roleName } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState(null);

  const fetchLeaves = async () => {
    try {
      const endpoint = roleName === "Admin" || roleName === "HR" ? "/leave/all" : "/leave/my";
      const res = await API.get(endpoint);
      setLeaves(res.data || []);
    } catch {
      toast.error("Failed to fetch leaves");
    }
  };

  useEffect(() => {
    if (!roleName) return;
    const endpoint = roleName === "Admin" || roleName === "HR" ? "/leave/all" : "/leave/my";
    API.get(endpoint)
      .then((res) => setLeaves(res.data || []))
      .catch(() => toast.error("Failed to fetch leaves"));
  }, [roleName]);

  const handleCancel = async (id) => {
    try {
      await API.patch(`/leave/${id}/cancel`);
      toast.success("Leave cancelled");
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel leave");
    }
  };

  const statusColor = (status) => {
    if (status === "Approved") return "bg-green-500/15 text-green-600";
    if (status === "Rejected" || status === "Cancelled") return "bg-red-500/15 text-red-600";
    return "bg-amber-500/15 text-amber-600";
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Leave Tracking & Audit History</h2>

          {leaves.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leave records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Leave Type</th>
                    <th className="py-3 pr-4">Dates</th>
                    <th className="py-3 pr-4">Working Days</th>
                    <th className="py-3 pr-4">Stage / Status</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaves.map((l) => {
                    const isPending = ["Pending Manager", "Pending HR"].includes(l.status);
                    return (
                      <tr key={l._id}>
                        <td className="py-3 pr-4 font-medium">{l.empId?.name || "Unknown"}</td>
                        <td className="py-3 pr-4">{l.leaveTypeId?.typeName || "N/A"}</td>
                        <td className="py-3 pr-4">
                          {new Date(l.startDate).toISOString().slice(0, 10)} →{" "}
                          {new Date(l.endDate).toISOString().slice(0, 10)}
                        </td>
                        <td className="py-3 pr-4">{l.noOfDays}</td>
                        <td className="py-3 pr-4">
                          <Badge className={statusColor(l.status)}>{l.status}</Badge>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAudit(l)}
                          >
                            Audit Trail
                          </Button>
                          {isPending && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancel(l._id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg rounded-2xl">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Audit Trail — {selectedAudit.leaveTypeId?.typeName}</h3>
                <Button size="sm" variant="ghost" onClick={() => setSelectedAudit(null)}>
                  Close
                </Button>
              </div>
              <div className="space-y-2.5 max-h-80 overflow-y-auto">
                {(selectedAudit.auditTrail || []).map((entry, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-3 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>{entry.action} ({entry.toStatus})</span>
                      <span className="text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Actor: {entry.actorId?.name || "System"} ({entry.actorRole})
                    </p>
                    {entry.remarks && <p className="mt-1">Remarks: {entry.remarks}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
