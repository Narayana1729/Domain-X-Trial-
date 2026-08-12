"use client"

import { usePathname } from "next/navigation"
import { Home, Activity, FileText, Settings, Cpu, ShieldAlert, Radio } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Health Overview",
    url: "/",
    icon: Home,
  },
  {
    title: "Vibration & FFT Spectrum",
    url: "/meters",
    icon: Radio,
  },
  {
    title: "GenAI Repair Reports",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Hardware & Telemetry",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-[#2A2A2A] bg-[#1B1B1B]">
      <SidebarHeader className="p-6">
        <div className="flex flex-col items-center justify-center w-full h-16 bg-[#FF6B00] rounded-lg p-2 text-black shadow-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 font-bold" />
            <span className="font-extrabold text-xl tracking-wider">DOMAIN-X</span>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-tight uppercase opacity-90">PdM Machine Engine</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="data-[active=true]:bg-[#FF6B00] data-[active=true]:text-black hover:bg-[#FF6B00]/20 font-medium"
                  >
                    <a href={item.url} className="flex items-center gap-3 px-3 py-2.5">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-6 border-t border-[#2A2A2A]">
        <div className="flex flex-col gap-1 text-[#9A9A9A] text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            ESP32 Serial: 200 Hz Live
          </div>
          <span className="text-[11px]">System Status: Connected</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
