
"use client";

import { Bell, CheckCircle, PlusCircle, UserPlus, Award, Loader2 } from 'lucide-react';
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
import type { Notification } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getUserNotifications, markNotificationsAsRead } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Map notification types to icons
const notificationIcons: { [key in Notification['type']]: React.ElementType } = {
  new_level: Award,
  new_badge: Award,
  alliance_join_request: UserPlus,
  alliance_join_approved: UserPlus,
  mission_assigned: PlusCircle,
  mission_completed: CheckCircle,
  reward_redeemed: CheckCircle,
};

export function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener effect
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    // Set loading to true when starting to listen
    setIsLoading(true);

    const unsubscribe = getUserNotifications(user.uid, (updatedNotifications) => {
      setNotifications(updatedNotifications);
      // Set loading to false once the first batch of notifications is received
      if (isLoading) {
        setIsLoading(false);
      }
    });

    // Cleanup function to unsubscribe when the component unmounts or user changes
    return () => {
      unsubscribe();
    };
    // We only want to re-run this effect when the user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    try {
        await markNotificationsAsRead(user.uid, unreadIds);
        // The real-time listener will automatically update the UI,
        // so we don't need to manually set state here.
    } catch (error) {
        console.error("Failed to mark notifications as read:", error);
        toast({ title: "Erro ao atualizar notificações", variant: 'destructive'});
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
        
        {isLoading ? (
             <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
             </div>
        ) : notifications.length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">Nenhuma notificação por enquanto.</p>
        ) : (
            notifications.map(notification => {
                const Icon = notificationIcons[notification.type] || Bell;
                const timeAgo = formatDistanceToNowStrict(notification.createdAt.toDate(), { locale: ptBR, addSuffix: true });
                return (
                    <DropdownMenuItem key={notification.id} asChild className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto">
                        <Link href={notification.href} className="flex items-start gap-3 p-2 hover:bg-accent/50 rounded-md">
                           {!notification.isRead && <div className="mt-2 flex h-2 w-2 rounded-full bg-primary" />}
                           <div className={`flex-shrink-0 p-1.5 rounded-full bg-muted mt-0.5 ${notification.isRead ? 'opacity-60' : ''}`}>
                             <Icon className="h-5 w-5 text-muted-foreground" />
                           </div>
                           <div className="grid gap-1 flex-grow">
                             <p className="text-sm font-medium">{notification.title}</p>
                             <p className="text-sm text-muted-foreground">{notification.description}</p>
                             <p className="text-xs text-muted-foreground">{timeAgo}</p>
                           </div>
                        </Link>
                    </DropdownMenuItem>
                )
            })
        )}
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
