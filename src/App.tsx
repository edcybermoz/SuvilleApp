import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SystemConfigProvider } from "./contexts/SystemConfigContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import Categorias from "./pages/Categorias";
import Usuarios from "./pages/Usuarios";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import ControleSistema from "./pages/ControleSistema";
import Perfil from "./pages/Perfil";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SystemConfigProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/vendas"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <Vendas />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/vendas/nova"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <NovaVenda />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/clientes"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <Clientes />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/produtos"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <Produtos />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/categorias"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <Categorias />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/usuarios"
                    element={
                      <ProtectedRoute requireAdmin requireSystemAccess>
                        <Usuarios />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/relatorios"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <Relatorios />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/configuracoes"
                    element={
                      <ProtectedRoute requireSystemAccess>
                        <Configuracoes />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/controle-sistema"
                    element={
                      <ProtectedRoute requireAdmin>
                        <ControleSistema />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/perfil"
                    element={
                      <ProtectedRoute>
                        <Perfil />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </SystemConfigProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;