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
  FolderKanban,
  ChevronDown
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
import { AnimatePresence, motion } from 'framer-motion';

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

const itemVariants = {
  open: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  },
  closed: {
    opacity: 0,
    scale: 0.3,
    filter: "blur(20px)",
    transition: { duration: 0.2 }
  }
};

const listVariants = {
  open: {
    height: "auto",
    opacity: 1,
    transition: {
      type: "spring" as const,
      bounce: 0,
      duration: 0.4,
      delayChildren: 0.1,
      staggerChildren: 0.05
    }
  },
  closed: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      staggerDirection: -1 as const,
      staggerChildren: 0.03
    }
  }
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    'Menu Principal': true,
    'Gestão': true,
    'Configurações': true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

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
        {menuGroups.map((group) => {
          const isOpen = !!openGroups[group.label];
          return (
            <SidebarGroup key={group.label} className="transition-all duration-300">
              <div 
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between cursor-pointer group/label py-1"
              >
                <SidebarGroupLabel className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 mb-2 cursor-pointer group-hover/label:text-zinc-300 transition-colors">
                  {group.label}
                </SidebarGroupLabel>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-zinc-500 group-hover/label:text-zinc-300 mr-2 mb-2"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={group.label}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    variants={listVariants}
                    style={{ overflow: "hidden" }}
                  >
                    <SidebarMenu>
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <motion.div 
                            key={item.href} 
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className="relative"
                          >
                            <SidebarMenuItem className="relative z-0">
                              <SidebarMenuButton
                                render={<Link href={item.href} />}
                                isActive={isActive}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group w-full bg-transparent relative z-10",
                                  isActive
                                    ? "text-white font-bold"
                                    : "text-zinc-400 hover:text-white"
                                )}
                              >
                                <div className="flex items-center gap-3 relative z-10">
                                  <item.icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-110", isActive ? "text-white" : "text-zinc-400 group-hover:text-white")} />
                                  <span className="font-medium">{item.label}</span>
                                </div>
                                {isActive && (
                                  <motion.div 
                                    layoutId="activeDot"
                                    className="w-1.5 h-1.5 rounded-full bg-white ml-auto relative z-10 shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                                  />
                                )}
                              </SidebarMenuButton>

                              {isActive && (
                                <motion.div
                                  layoutId="activePill"
                                  className="absolute inset-0 bg-gradient-to-r from-zinc-900 to-zinc-950/40 border border-zinc-800/80 rounded-xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_20px_-2px_rgba(0,0,0,0.5)]"
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}
                            </SidebarMenuItem>
                          </motion.div>
                        );
                      })}
                    </SidebarMenu>
                  </motion.div>
                )}
              </AnimatePresence>
            </SidebarGroup>
          );
        })}
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
