
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/contexts/FamilyContext';
import Loading from './loading';
import { getChildProfilesForAttribution } from '@/lib/firebase/firestore';

export default function DashboardRedirectPage() {
    const { user, loading: authLoading } = useAuth();
    const { availableContexts, isLoading: familyLoading } = useFamily();
    const router = useRouter();

    useEffect(() => {
        if (authLoading || familyLoading) {
            return;
        }

        if (!user) {
            return;
        }

        // We need a quick check for children to decide the route.
        // This is a minimal fetch, only checking for existence.
        const checkForChildren = async () => {
            try {
                // We check across all contexts to see if the user has ANY children.
                const childPromises = availableContexts.map(context =>
                    getChildProfilesForAttribution(user.uid, context.id)
                );
                const childrenResults = await Promise.all(childPromises);
                const hasAnyChildren = childrenResults.some(result => result.length > 0);

                if (!hasAnyChildren) {
                    // A true new user is sent to the onboarding assistant
                    router.replace('/dashboard/assistente');
                } else {
                    // An existing user is sent to their main summary page
                    router.replace('/dashboard/heroes');
                }
            } catch (error) {
                console.error("Error checking for children, defaulting to heroes page:", error);
                router.replace('/dashboard/heroes');
            }
        };

        checkForChildren();

    }, [user, authLoading, familyLoading, availableContexts, router]);

    // Render a loading state while the logic runs
    return <Loading />;
}
