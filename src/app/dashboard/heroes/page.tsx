
"use client";

import { Suspense } from "react";
import Loading from "./loading";
import { HeroesSummary } from "@/components/dashboard/heroes/HeroesSummary";

export default function HeroesPage() {
    return (
        <Suspense fallback={<Loading />}>
            <HeroesSummary />
        </Suspense>
    )
}
