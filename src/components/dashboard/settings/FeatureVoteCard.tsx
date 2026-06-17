
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { toggleUserFeatureVote, getFeatureVoteCount, getUserFeatureVote } from '@/lib/supabase/db';
import { Loader2, ThumbsUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FeatureVoteCardProps {
  featureId: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureVoteCard({ featureId, icon: Icon, title, description }: FeatureVoteCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVoteData = async () => {
      setIsLoading(true);
      try {
        const countPromise = getFeatureVoteCount(featureId);
        const userVotePromise = user ? getUserFeatureVote(user.uid, featureId) : Promise.resolve(false);
        
        const [count, userVote] = await Promise.all([countPromise, userVotePromise]);
        
        setVoteCount(count);
        setHasVoted(userVote);
      } catch (error) {
        console.error("Error fetching vote data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVoteData();
  }, [featureId, user]);

  const handleVote = async () => {
    if (!user) {
      toast({
        title: "Login Necessário",
        description: "Você precisa estar logado para votar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      await toggleUserFeatureVote(user.uid, featureId);
      const newCount = await getFeatureVoteCount(featureId);
      setVoteCount(newCount);
      setHasVoted(!hasVoted);
    } catch (error) {
      console.error("Error toggling vote:", error);
      toast({
        title: "Erro ao Votar",
        description: "Não foi possível registrar seu voto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 text-card-foreground shadow-sm h-full">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-1 text-primary" />
        <div className="flex-grow">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end">
        <Button variant={hasVoted ? "secondary" : "outline"} size="sm" onClick={handleVote} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ThumbsUp className={`mr-2 h-4 w-4 ${hasVoted ? 'text-primary' : ''}`} />
          )}
          {voteCount} Like{voteCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
