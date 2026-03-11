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
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />

      <div className="flex min-h-screen flex-1 flex-col lg:ml-60">
        <AppHeader />

        <main className="flex-1 space-y-4 p-4 pt-20 md:p-6 md:pt-24 lg:p-6 lg:pt-6">
          <TrialBanner />
          <SystemGuards />
          <Outlet />
        </main>
      </div>

      {!userData && <SyncTest />}
    </div>
  );
};

export default AppLayout;