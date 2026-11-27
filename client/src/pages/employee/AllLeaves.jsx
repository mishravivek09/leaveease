import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = [
  "",
  "Pending Manager",
  "Pending HR",
  "Approved",
  "Rejected",
  "Cancelled",
];

export default function AllLeaves() {
  const { user, roleName } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchLeaves = async () => {
    try {
      const base = roleName === "Admin" || roleName === "HR" ? "/leave/all" : "/leave/my";
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await API.get(`${base}${query}`);
      setLeaves(res.data || []);
    } catch {
      toast.error("Failed to fetch leaves");
    }
  };

  useEffect(() => {
    if (!roleName) return;
    const base = roleName === "Admin" || roleName === "HR" ? "/leave/all" : "/leave/my";
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
    API.get(`${base}${query}`)
      .then((res) => setLeaves(res.data || []))
      .catch(() => toast.error("Failed to fetch leaves"));
  }, [roleName, statusFilter]);

  const handleDecision = async (id, decision) => {
    let remarks = "";
    if (decision === "Rejected") {
      remarks = window.prompt("Enter rejection remarks:") || "";
      if (!remarks.trim()) {
        toast.error("Remarks are required when rejecting");
        return;
      }
    }

    try {
      await API.put(`/leave/${id}/decision`, { decision, remarks });
      toast.success(`Leave ${decision.toLowerCase()}`);
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  const canDecideRow = (l) => {
    if (!["Pending Manager", "Pending HR"].includes(l.status)) return false;
    if (l.empId?._id === user?._id) return false;
    if (roleName === "Admin") return true;
    if (roleName === "HR" && l.status === "Pending HR") return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((st) => (
          <Button
            key={st || "All"}
            size="sm"
            variant={statusFilter === st ? "default" : "outline"}
            onClick={() => setStatusFilter(st)}
          >
            {st || "All"}
          </Button>
        ))}
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5">
          {leaves.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leave requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Type</th>
                    <th className="py-3 pr-4">Period</th>
                    <th className="py-3 pr-4">Days</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaves.map((l) => (
                    <tr key={l._id}>
                      <td className="py-3 pr-4 font-medium">{l.empId?.name || "Unknown"}</td>
                      <td className="py-3 pr-4">{l.leaveTypeId?.typeName || "N/A"}</td>
                      <td className="py-3 pr-4">
                        {new Date(l.startDate).toISOString().slice(0, 10)} →{" "}
                        {new Date(l.endDate).toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 pr-4">{l.noOfDays}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{l.status}</Badge>
                      </td>
                      <td className="py-3 text-right space-x-2">
                        {canDecideRow(l) && (
                          <>
                            <Button size="sm" onClick={() => handleDecision(l._id, "Approved")}>
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDecision(l._id, "Rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
