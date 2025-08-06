
"use client";

import { Suspense, useEffect, useState } from "react";
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";
import { useAuth } from "@/contexts/AuthContext";
import { GettingStartedGuide } from "@/components/dashboard/GettingStartedGuide";

export default function HeroesPage() {
    const { user, loading: authLoading } = useAuth();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            setShouldRender(true);
        }
    }, [authLoading]);

    if (!shouldRender) {
        return <Loading />;
    }
    
    return (
        <Suspense fallback={<Loading />}>
            <HeroesSummary />
        </Suspense>
    )
}
