import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AppHeader = () => {
  const { userData } = useAuth();

  const getInitials = () => {
    if (!userData?.nome) return "U";
    return userData.nome
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-16 items-center justify-end border-b border-border bg-card px-6 gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden md:inline">
          {userData?.nome}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
          {getInitials()}
        </div>
      </div>

      <button className="relative text-muted-foreground hover:text-foreground">
        <Bell className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
      </button>
    </header>
  );
};

export default AppHeader;