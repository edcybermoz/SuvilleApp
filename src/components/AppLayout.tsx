// src/components/AppLayout.tsx
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { SyncTest } from "./SyncTest";
import { useAuth } from "@/contexts/AuthContext";
const AppLayout = () => {
  const { userData } = useAuth(); 

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="ml-60 flex flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      {!userData && <SyncTest />} {/*#*/}
    </div>
  );
};

export default AppLayout;