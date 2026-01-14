import { Calendar, Home, Inbox, Search, Settings, Users, FileText, Clock, LogOut, CalendarRange } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Button } from "../ui/button"

// Menu items.
const items = [
  {
    title: "Visão Geral",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Funcionários",
    url: "/dashboard/funcionarios",
    icon: Users,
  },
  {
    title: "Escalas",
    url: "/dashboard/escalas",
    icon: CalendarRange,
  },
  {
    title: "Registros de Ponto",
    url: "/dashboard/pontos",
    icon: Clock,
  },
  {
    title: "Relatórios Fiscais",
    url: "/dashboard/relatorios",
    icon: FileText,
  },
  {
    title: "Configurações",
    url: "/dashboard/configuracoes",
    icon: Settings,
  },
]

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>PontoCrevin Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
