// src/components/SyncTest.tsx
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { syncCurrentUser } from "@/scripts/syncUsers";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

export const SyncTest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  if (!user) return null;

  const handleSync = async () => {
    setLoading(true);
    setStatus("idle");
    try {
      const success = await syncCurrentUser({ useUidAsId: true });
      setStatus(success ? "success" : "error");
      if (success) {
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (error) {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card p-4 rounded-lg shadow-lg border max-w-sm">
      <div className="flex items-center gap-2 mb-3 text-yellow-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="font-semibold">Perfil não encontrado</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3">
        Clique no botão abaixo para criar seu perfil no sistema.
      </p>

      <Button 
        onClick={handleSync} 
        disabled={loading || status === "success"}
        className="w-full"
        variant={status === "success" ? "outline" : "default"}
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
        ) : status === "success" ? (
          "✓ Perfil criado! Recarregando..."
        ) : (
          "Criar meu perfil"
        )}
      </Button>
    </div>
  );
};