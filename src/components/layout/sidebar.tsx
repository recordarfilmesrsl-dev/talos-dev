'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Settings,
  Zap,
  UserCheck,
  ArrowRightLeft,
  FileText,
  Briefcase,
  ClipboardList,
  FolderKanban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';

const menuGroups = [
  {
    label: 'Menu Principal',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Users, label: 'Leads', href: '/leads' },
      { icon: ArrowRightLeft, label: 'CRM', href: '/crm' },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { icon: UserCheck, label: 'Clientes', href: '/clients' },
      { icon: FolderKanban, label: 'Projetos', href: '/projects' },
      { icon: Briefcase, label: 'Funcionários', href: '/employees' },
      { icon: ClipboardList, label: 'Tarefas', href: '/tasks' },
      { icon: FileText, label: 'Contratos', href: '/contracts' },
      { icon: DollarSign, label: 'Financeiro', href: '/billing' },
    ]
  },
  {
    label: 'Configurações',
    items: [
      { icon: Settings, label: 'Configurações', href: '/settings' },
    ]
  }
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-zinc-900 bg-black" {...props}>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-100 text-black rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5 fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Talos ERP</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group w-full",
                        isActive
                          ? "bg-zinc-900 text-white font-medium"
                          : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white ml-auto" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 mt-auto">
        <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-900">
          <p className="text-xs text-zinc-500 font-medium mb-1">Status do Sistema</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-zinc-300 font-medium">Operacional</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
