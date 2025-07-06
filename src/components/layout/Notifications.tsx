
"use client";

import { Bell, CheckCircle, PlusCircle, UserPlus, Award, Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Notification, ChildProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import { useState, useEffect, useMemo } from 'react';
import { getUserNotifications, markNotificationsAsRead, getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

// Map notification types to icons
const notificationIcons: { [key in Notification['type']]: React.ElementType } = {
  new_level: Award,
  new_badge: Award,
  alliance_join_request: UserPlus,
  alliance_join_approved: UserPlus,
  mission_assigned: PlusCircle,
  mission_completed: CheckCircle,
  reward_redeemed: CheckCircle,
  mission_completion_undone: Undo2,
};

const notificationTypeMap: { [key in Notification['type']]: string } = {
    new_level: 'system',
    new_badge: 'system',
    alliance_join_request: 'alliance',
    alliance_join_approved: 'alliance',
    mission_assigned: 'missions',
    mission_completed: 'missions',
    reward_redeemed: 'rewards',
    mission_completion_undone: 'missions',
};

const notificationCategoryLabels: { [key: string]: string } = {
    all: 'Todos os Tipos',
    missions: 'Missões',
    rewards: 'Recompensas',
    system: 'Sistema',
    alliance: 'Aliança',
};

export function Notifications() {
  const { user } = useAuth();
  const { currentContext, setCurrentContext } = useFamily();
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [childFilter, setChildFilter] = useState('all');
  
  const [pendingNavigation, setPendingNavigation] = useState<{ href: string; contextId: string } | null>(null);

  // Real-time listener effect for notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsubscribe = getUserNotifications(user.uid, (updatedNotifications) => {
      setNotifications(updatedNotifications);
      if (isLoading) {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch children for filter dropdown
  useEffect(() => {
    if (!user) {
      setChildren([]);
      setIsLoadingChildren(false);
      return;
    }
    setIsLoadingChildren(true);
    getChildProfilesForAttribution(user.uid, currentContext)
      .then(setChildren)
      .catch(err => {
        console.error("Failed to fetch children for notifications:", err);
        setChildren([]);
      })
      .finally(() => setIsLoadingChildren(false));
  }, [user, currentContext]);

  // Effect to handle navigation *after* context switch
  useEffect(() => {
    if (pendingNavigation && currentContext === pendingNavigation.contextId) {
      router.push(pendingNavigation.href);
      setPendingNavigation(null); // Clear pending navigation after it's done
    }
  }, [currentContext, pendingNavigation, router]);


  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    try {
        await markNotificationsAsRead(user.uid, unreadIds);
    } catch (error) {
        console.error("Failed to mark notifications as read:", error);
        toast({ title: "Erro ao atualizar notificações", variant: 'destructive'});
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const typeMatch = typeFilter === 'all' || notificationTypeMap[notification.type] === typeFilter;
      const childMatch = childFilter === 'all' || notification.relatedChildId === childFilter;
      return typeMatch && childMatch;
    });
  }, [notifications, typeFilter, childFilter]);
  
  const handleNotificationClick = (notification: Notification) => {
    // If the notification has a related context and it's different from the current one
    if (notification.relatedContextId && notification.relatedContextId !== currentContext) {
      // Set the pending navigation state which the useEffect will watch
      setPendingNavigation({ href: notification.href, contextId: notification.relatedContextId });
      // Trigger the context switch
      setCurrentContext(notification.relatedContextId);
    } else {
      // If no context switch is needed, navigate immediately
      router.push(notification.href);
    }
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
             <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0 text-xs"
             >
                {unreadCount}
             </Badge>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
            <span>Notificações</span>
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} nova(s)</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="p-2 flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Filtrar por tipo..." />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(notificationCategoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={childFilter} onValueChange={setChildFilter} disabled={isLoadingChildren || children.length === 0}>
                <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Filtrar por herói..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os Heróis</SelectItem>
                    {children.map(child => (
                        <SelectItem key={child.id} value={child.id} className="text-xs">{child.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px] pr-3">
            <div className="space-y-1">
                {isLoading ? (
                     <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                     </div>
                ) : filteredNotifications.length === 0 ? (
                    <p className="p-4 text-sm text-center text-muted-foreground">
                        {notifications.length > 0 ? "Nenhuma notificação encontrada com os filtros atuais." : "Nenhuma notificação por enquanto."}
                    </p>
                ) : (
                    filteredNotifications.map(notification => {
                        const Icon = notificationIcons[notification.type] || Bell;
                        const timeAgo = notification.createdAt ? formatDistanceToNowStrict(notification.createdAt.toDate(), { locale: ptBR, addSuffix: true }) : "agora mesmo";
                        return (
                           <DropdownMenuItem
                              key={notification.id}
                              onSelect={() => handleNotificationClick(notification)}
                              className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto h-auto whitespace-normal p-0"
                            >
                              <div className="flex items-start gap-3 p-2 hover:bg-accent/50 rounded-md w-full">
                                {!notification.isRead && <div className="mt-2 flex h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                                <div className={`flex-shrink-0 p-1.5 rounded-full bg-muted mt-0.5 ${notification.isRead ? 'opacity-60' : ''} ${!notification.isRead ? 'ml-[-16px]' : ''}`}>
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="grid gap-1 flex-grow">
                                  <p className="text-sm font-medium leading-tight">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground leading-snug">{notification.description}</p>
                                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                                </div>
                              </div>
                            </DropdownMenuItem>
                        )
                    })
                )}
            </div>
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
            className="justify-center text-sm text-muted-foreground cursor-pointer" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
        >
            Marcar todas como lidas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
