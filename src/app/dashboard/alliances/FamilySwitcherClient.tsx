
"use client";

import { useFamily } from '@/contexts/FamilyContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface FamilySwitcherClientProps {
    contextId: string;
    action: 'details';
}

export function FamilySwitcherClient({ contextId, action }: FamilySwitcherClientProps) {
    const { setCurrentContext } = useFamily();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = () => {
        setIsLoading(true);
        setCurrentContext(contextId);
        router.push('/dashboard/family');
    };

    return (
        <Button onClick={handleClick} disabled={isLoading}>
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
    )
}
