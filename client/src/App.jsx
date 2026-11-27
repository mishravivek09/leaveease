import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/auth/Login";
import Dashboard from "./pages/employee/Dashboard";
import ApplyLeave from "./pages/employee/ApplyLeave";
import AllLeaves from "./pages/employee/AllLeaves";
import TrackLeaves from "./pages/employee/TrackLeave";
import Profile from "./pages/Profile";
import Approvals from "./pages/manager/Approvals";
import Users from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import MasterData from "./pages/admin/MasterData";

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["Employee", "Manager", "HR", "Admin"]}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["Employee", "Manager", "HR", "Admin"]}>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/apply"
            element={
              <ProtectedRoute roles={["Employee", "Manager", "HR"]}>
                <Layout>
                  <ApplyLeave />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/track-leaves"
            element={
              <ProtectedRoute roles={["Employee", "Manager", "HR"]}>
                <Layout>
                  <TrackLeaves />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaves"
            element={
              <ProtectedRoute roles={["Employee", "Manager", "HR", "Admin"]}>
                <Layout>
                  <AllLeaves />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/approvals"
            element={
              <ProtectedRoute roles={["Manager", "HR"]}>
                <Layout>
                  <Approvals />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/master-data"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <Layout>
                  <MasterData />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={["Manager", "HR", "Admin"]}>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
