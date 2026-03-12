import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { SyncTest } from "./SyncTest";
import { useAuth } from "@/contexts/AuthContext";
import TrialBanner from "./TrialBanner";
import SystemGuards from "./SystemGuards";

const AppLayout = () => {
  const { userData } = useAuth();

  return (
    <div className="app-shell">
      <AppSidebar />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-60">
        <AppHeader />

        <main className="flex-1 min-w-0">
          <div className="app-page space-y-4 pt-20 md:pt-24 lg:pt-6">
            <TrialBanner />
            <SystemGuards />
            <Outlet />
          </div>
        </main>
      </div>

      {!userData && <SyncTest />}
    </div>
  );
};

export default AppLayout;