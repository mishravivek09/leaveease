import { useEffect, useState } from "react";
import API from "@/lib/api";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function Approvals() {
  const [leaves, setLeaves] = useState([]);
  const [stageFilter, setStageFilter] = useState("pending");
  const [modalState, setModalState] = useState({ open: false, leave: null, decision: "" });
  const [remarks, setRemarks] = useState("");

  const fetchLeaves = async () => {
    try {
      const res = await API.get("/leave/team");
      setLeaves(res.data || []);
    } catch {
      toast.error("Failed to fetch approval queue");
    }
  };

  useEffect(() => {
    API.get("/leave/team")
      .then((res) => setLeaves(res.data || []))
      .catch(() => toast.error("Failed to fetch approval queue"));
  }, []);

  const openModal = (leave, decision) => {
    setRemarks("");
    setModalState({ open: true, leave, decision });
  };

  const confirmDecision = async () => {
    if (modalState.decision === "Rejected" && !remarks.trim()) {
      toast.error("Remarks are required when rejecting");
      return;
    }

    try {
      await API.put(`/leave/${modalState.leave._id}/decision`, {
        decision: modalState.decision,
        remarks,
      });
      toast.success(`Request ${modalState.decision.toLowerCase()}`);
      setModalState({ open: false, leave: null, decision: "" });
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  const filtered = leaves.filter((l) => {
    if (stageFilter === "pending") return ["Pending Manager", "Pending HR"].includes(l.status);
    return l.status === stageFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "pending", label: "Pending Action" },
          { key: "Pending Manager", label: "Pending Manager" },
          { key: "Pending HR", label: "Pending HR" },
          { key: "Approved", label: "Approved" },
          { key: "Rejected", label: "Rejected" },
        ].map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={stageFilter === tab.key ? "default" : "outline"}
            onClick={() => setStageFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No requests in this queue.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((l) => (
                <div
                  key={l._id}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{l.empId?.name || "Unknown Employee"}</span>
                      <Badge variant="outline">{l.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {l.empId?.deptId?.deptName || "Dept"} • {l.leaveTypeId?.typeName} •{" "}
                      {new Date(l.startDate).toISOString().slice(0, 10)} →{" "}
                      {new Date(l.endDate).toISOString().slice(0, 10)} ({l.noOfDays} working day(s))
                    </p>
                    <p className="mt-1 text-sm">{l.reason}</p>
                  </div>

                  {["Pending Manager", "Pending HR"].includes(l.status) && (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" onClick={() => openModal(l, "Approved")}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openModal(l, "Rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={modalState.open}
        onOpenChange={(open) => !open && setModalState({ open: false, leave: null, decision: "" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {modalState.decision} — {modalState.leave?.empId?.name || "Employee"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {modalState.decision === "Rejected"
                ? "Please provide remarks explaining the rejection."
                : "Optional remarks for this approval:"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks..."
            className="w-full rounded-xl border border-border bg-background p-3 text-sm"
          />

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDecision}>
              Confirm {modalState.decision}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
