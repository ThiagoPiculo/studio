
"use client";

import { Bell, CheckCircle, PlusCircle, UserPlus, Award, Loader2, Undo2, Edit3, Trash2, UserCheck, UserX, NotebookPen, Link as LinkIcon } from 'lucide-react';
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
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getUserNotifications, markNotificationsAsRead, getChildProfilesForAttribution } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { convertTimestampsInObject } from '@/lib/utils';


// Map notification types to icons
const notificationIcons: { [key in Notification['type']]: React.ElementType } = {
  new_level: Award,
  new_badge: Award,
  alliance_join_request: UserPlus,
  alliance_ownership_request: UserPlus,
  alliance_join_approved: UserPlus,
  mission_assigned: PlusCircle,
  mission_completed: CheckCircle,
  reward_redeemed: CheckCircle,
  mission_completion_undone: Undo2,
  template_created: PlusCircle,
  template_updated: Edit3,
  template_deleted: Trash2,
  instance_assigned: UserCheck,
  instance_unassigned: UserX,
  school_schedule_entry_created: NotebookPen,
  school_schedule_entry_updated: Edit3,
  school_schedule_entry_deleted: Trash2,
};

const notificationTypeMap: { [key in Notification['type']]: string } = {
    new_level: 'system',
    new_badge: 'system',
    alliance_join_request: 'alliance',
    alliance_ownership_request: 'alliance',
    alliance_join_approved: 'alliance',
    mission_assigned: 'missions',
    mission_completed: 'missions',
    reward_redeemed: 'rewards',
    mission_completion_undone: 'missions',
    template_created: 'management',
    template_updated: 'management',
    template_deleted: 'management',
    instance_assigned: 'management',
    instance_unassigned: 'management',
    school_schedule_entry_created: 'management',
    school_schedule_entry_updated: 'management',
    school_schedule_entry_deleted: 'management',
};

const notificationCategoryLabels: { [key: string]: string } = {
    all: 'Todos os Tipos',
    missions: 'Missões',
    rewards: 'Recompensas',
    system: 'Sistema',
    alliance: 'Aliança',
    management: 'Gestão',
};

export function Notifications() {
  const { user } = useAuth();
  const { currentContext, setCurrentContext, availableContexts } = useFamily();
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  // Filter states
  const [readStatusFilter, setReadStatusFilter] = useState('unread');
  const [typeFilter, setTypeFilter] = useState('all');
  const [childFilter, setChildFilter] = useState('all');
  
  const [pendingNavigation, setPendingNavigation] = useState<{ href: string; contextId: string } | null>(null);
  
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications = querySnapshot.docs.map(doc => 
        convertTimestampsInObject({ id: doc.id, ...doc.data() }) as Notification
      );
      setNotifications(fetchedNotifications);
      setIsLoading(false);
    }, (error) => {
      console.error("Failed to fetch notifications in real-time:", error);
      setIsLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
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
  
  const unreadCountsByType = useMemo(() => {
    return notifications.reduce((acc, notification) => {
        if (!notification.isRead) {
            const category = notificationTypeMap[notification.type];
            if (category) {
                acc[category] = (acc[category] || 0) + 1;
            }
        }
        return acc;
    }, {} as Record<string, number>);
  }, [notifications]);

  const unreadCountsByChild = useMemo(() => {
      return notifications.reduce((acc, notification) => {
          if (!notification.isRead && notification.relatedChildId) {
              acc[notification.relatedChildId] = (acc[notification.relatedChildId] || 0) + 1;
          }
          return acc;
      }, {} as Record<string, number>);
  }, [notifications]);

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    try {
        await markNotificationsAsRead(user.uid, unreadIds);
        // No need to refetch, onSnapshot will handle UI update if read status changes other documents
        // But for our case, it's just a local state update essentially
         setNotifications(prev => 
          prev.map(n => unreadIds.includes(n.id) ? { ...n, isRead: true } : n)
        );
    } catch (error) {
        console.error("Failed to mark notifications as read:", error);
        toast({ title: "Erro ao atualizar notificações", variant: 'destructive'});
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      const typeMatch = typeFilter === 'all' || notificationTypeMap[notification.type] === typeFilter;
      const childMatch = childFilter === 'all' || notification.relatedChildId === childFilter;
      const readMatch = readStatusFilter === 'all' ||
                        (readStatusFilter === 'unread' && !notification.isRead) ||
                        (readStatusFilter === 'read' && notification.isRead);
      return typeMatch && childMatch && readMatch;
    });
  }, [notifications, typeFilter, childFilter, readStatusFilter]);
  
  const handleNotificationClick = (notification: Notification) => {
    // Ação especial para convites: nunca mudar o contexto, apenas navegar.
    if (notification.type === 'alliance_join_request') {
      router.push(notification.href);
      return;
    }
    
    // Se a notificação tem um contexto diferente do atual, muda o contexto primeiro
    if (notification.relatedContextId && notification.relatedContextId !== currentContext) {
      setPendingNavigation({ href: notification.href, contextId: notification.relatedContextId });
      setCurrentContext(notification.relatedContextId);
    } else {
      // Se não precisa de mudança de contexto, navega imediatamente.
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

        <div className="p-2 grid grid-cols-3 gap-2">
            <Select value={readStatusFilter} onValueChange={setReadStatusFilter}>
                <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Status..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">Todas</SelectItem>
                    <SelectItem value="unread" className="text-xs">Não Lidas</SelectItem>
                    <SelectItem value="read" className="text-xs">Lidas</SelectItem>
                </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(notificationCategoryLabels).map(([key, label]) => {
                        const count = unreadCountsByType[key];
                        return (
                            <SelectItem key={key} value={key} className="text-xs">
                                <div className="flex justify-between items-center w-full">
                                    <span>{label}</span>
                                    {count > 0 && <Badge variant="destructive" className="ml-2 h-4 px-1.5">{count}</Badge>}
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>

            <Select value={childFilter} onValueChange={setChildFilter} disabled={isLoadingChildren || children.length === 0}>
                <SelectTrigger className="w-full h-8 text-xs">
                    <SelectValue placeholder="Herói..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos os Heróis</SelectItem>
                    {children.map(child => {
                        const count = unreadCountsByChild[child.id];
                        return (
                            <SelectItem key={child.id} value={child.id} className="text-xs">
                                <div className="flex justify-between items-center w-full">
                                    <span>{child.name}</span>
                                    {count > 0 && <Badge variant="destructive" className="ml-2 h-4 px-1.5">{count}</Badge>}
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px] pr-1">
            <div className="space-y-1 p-1">
                {isLoading ? (
                     <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                     </div>
                ) : filteredNotifications.length === 0 ? (
                    <p className="p-4 text-sm text-center text-muted-foreground">
                        {notifications.length > 0 ? "Nenhuma notificação com os filtros atuais." : "Nenhuma notificação por enquanto."}
                    </p>
                ) : (
                    filteredNotifications.map(notification => {
                        const Icon = notificationIcons[notification.type] || Bell;
                        const timeAgo = notification.createdAt ? formatDistanceToNowStrict(new Date(notification.createdAt), { locale: ptBR, addSuffix: true }) : "agora mesmo";
                        const context = availableContexts.find(c => c.id === notification.relatedContextId);
                        
                        return (
                           <DropdownMenuItem
                              key={notification.id}
                              onSelect={() => handleNotificationClick(notification)}
                              className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto h-auto whitespace-normal p-0"
                            >
                              <div className="flex items-start gap-2.5 p-2 hover:bg-accent/50 rounded-md w-full">
                                <div className="w-2 flex-shrink-0 pt-1.5">
                                    {!notification.isRead && <div className="h-2 w-2 rounded-full bg-primary" />}
                                </div>
                                <div className="flex-shrink-0 p-1.5 rounded-full bg-muted mt-0.5">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className={`grid gap-1 flex-grow ${notification.isRead ? 'opacity-70' : ''}`}>
                                  <p className="text-sm font-medium leading-tight">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground leading-snug">{notification.description}</p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{timeAgo}</span>
                                    {context && (
                                        <>
                                            <span>·</span>
                                            <span className="flex items-center gap-1.5">
                                                <LinkIcon className="h-3 w-3" />
                                                {context.name}
                                            </span>
                                        </>
                                    )}
                                  </div>
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
