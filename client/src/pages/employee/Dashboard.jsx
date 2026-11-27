import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import API from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { user, roleName } = useAuth();
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [balances, setBalances] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [teamPending, setTeamPending] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const requests = [API.get("/admin/holidays")];
        if (roleName === "Admin") {
          requests.push(API.get("/leave/stats/all"));
        } else {
          requests.push(API.get("/leave/my/stats"));
          requests.push(API.get("/users/my-balances"));
        }
        if (roleName === "Manager" || roleName === "HR") {
          requests.push(API.get("/leave/team"));
        }

        const results = await Promise.all(requests);
        setHolidays(results[0].data || []);
        setStats(results[1].data || { total: 0, approved: 0, pending: 0, rejected: 0 });

        if (roleName !== "Admin") {
          setBalances(results[2]?.data || []);
        }
        if (roleName === "Manager" || roleName === "HR") {
          const teamLeaves = results[3]?.data || [];
          setTeamPending(
            teamLeaves.filter((l) => ["Pending Manager", "Pending HR"].includes(l.status)).length
          );
        }
      } catch {
        // Handled by interceptor or empty defaults
      }
    };
    if (roleName) load();
  }, [roleName]);

  const upcomingHolidays = holidays
    .filter((h) => new Date(h.holidayDate) >= new Date(new Date().setUTCHours(0, 0, 0, 0)))
    .slice(0, 5);

  const balanceChartData = balances.map((b) => ({
    name: b.leaveTypeId?.typeName || "Leave",
    Used: b.used,
    Remaining: b.remaining,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome, {user?.name}</h2>
        <p className="text-sm text-muted-foreground">
          {roleName} • {user?.deptId?.deptName || "Organization"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {roleName === "Admin" ? "Total Applications" : "My Applications"}
              </p>
              <p className="mt-1 text-2xl font-bold">{stats.total}</p>
            </div>
            <Calendar className="text-primary" size={24} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Approved</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <CheckCircle2 className="text-green-600" size={24} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {roleName === "Manager" || roleName === "HR" ? "Team Pending Approvals" : "Pending"}
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {roleName === "Manager" || roleName === "HR" ? teamPending : stats.pending}
              </p>
            </div>
            <Clock className="text-amber-600" size={24} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Rejected</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="text-red-600" size={24} />
          </CardContent>
        </Card>
      </div>

      {roleName !== "Admin" && balances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {balances.map((b) => (
            <Card key={b._id} className="rounded-2xl border">
              <CardContent className="p-4">
                <p className="text-sm font-semibold">{b.leaveTypeId?.typeName}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-primary">{b.remaining}</span>
                  <span className="text-xs text-muted-foreground">
                    of {b.allocated + (b.carriedForward || 0)} days left
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used: {b.used} {b.carriedForward > 0 ? `• Carried: ${b.carriedForward}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {balanceChartData.length > 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-semibold">Leave Balance Overview</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={balanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="Used" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Remaining" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Upcoming Public Holidays</h3>
            {upcomingHolidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming holidays configured.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingHolidays.map((h) => (
                  <div
                    key={h._id}
                    className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{h.description}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.holidayDate).toISOString().slice(0, 10)}
                      {h.isOptional ? " (Optional)" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
