import { useEffect, useState } from "react";
import API from "@/lib/api";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const REPORT_TYPES = [
  { key: "history", label: "Employee Leave History" },
  { key: "department-utilisation", label: "Department-wise Utilisation" },
  { key: "register", label: "Monthly / Annual Leave Register" },
  { key: "pending", label: "Pending Approvals" },
  { key: "balances", label: "Leave Balance Summary" },
];

export default function Reports() {
  const [reportKey, setReportKey] = useState("history");
  const [rows, setRows] = useState([]);
  const [trends, setTrends] = useState([]);
  const [summary, setSummary] = useState({ totalUsers: 0, totalLeaves: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    Promise.all([API.get("/reports/summary"), API.get("/reports/trends")])
      .then(([s, t]) => {
        setSummary(s.data || {});
        setTrends(t.data || []);
      })
      .catch(() => toast.error("Failed to load summary"));
  }, []);

  useEffect(() => {
    API.get(`/reports/${reportKey}`)
      .then((res) => setRows(res.data || []))
      .catch(() => toast.error("Failed to load report"));
  }, [reportKey]);

  const downloadExport = async (format) => {
    try {
      const res = await API.get(`/reports/${reportKey}?format=${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportKey}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((rt) => (
            <Button
              key={rt.key}
              size="sm"
              variant={reportKey === rt.key ? "default" : "outline"}
              onClick={() => setReportKey(rt.key)}
            >
              {rt.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadExport("csv")}>
            Export CSV
          </Button>
          <Button size="sm" onClick={() => downloadExport("pdf")}>
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Employees</p><p className="text-xl font-bold">{summary.totalUsers}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-bold text-green-600">{summary.approved}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-amber-600">{summary.pending}</p></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-xl font-bold text-red-600">{summary.rejected}</p></CardContent></Card>
      </div>

      {trends.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Monthly Leave Trends</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="leaves" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-5 overflow-x-auto">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No records found.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="py-3 pr-4">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col) => (
                      <td key={col} className="py-3 pr-4">{String(row[col] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
