"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Users, Star, PlusCircle, CheckSquare, Smile, Brain, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChildProfile } from "@/lib/types";
import { getChildProfilesByOwner, getChildProfilesByFamily } from "@/lib/firebase/firestore";

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentContext } = useFamily();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!user) return;
      setIsLoadingChildren(true);
      try {
        let profiles: ChildProfile[];
        if (currentContext === 'my-space') {
          profiles = await getChildProfilesByOwner(user.uid);
        } else {
          // Assuming currentContext is a familyId
          profiles = await getChildProfilesByFamily(currentContext);
        }
        setChildren(profiles);
      } catch (error) {
        console.error("Error fetching children:", error);
        setChildren([]);
      } finally {
        setIsLoadingChildren(false);
      }
    };

    fetchChildren();
  }, [user, currentContext]);

  if (!user) {
    return <p>Loading user data...</p>;
  }

  const contextName = currentContext === 'my-space' ? "Your Space" : `Family: ${currentContext}`; // Replace with actual family name

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Welcome, {user.name || "Admin Master"}!</CardTitle>
          <CardDescription>Here's an overview of your MiniHeroes in <span className="font-semibold text-primary">{contextName}</span>.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Manage tasks, rewards, and watch your MiniHeroes grow!</p>
        </CardContent>
      </Card>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-headline">Your MiniHeroes</h2>
          <Link href="/dashboard/onboarding" passHref legacyBehavior>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Child</Button>
          </Link>
        </div>
        {isLoadingChildren ? (
          <p>Loading children...</p>
        ) : children.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <Smile className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No MiniHeroes Yet!</h3>
              <p className="text-muted-foreground mb-4">It looks a bit empty here. Start by adding your first child.</p>
              <Link href="/dashboard/onboarding" passHref legacyBehavior>
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Your First Hero
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card key={child.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary/30">
                  <CardTitle className="text-xl font-semibold">{child.name}</CardTitle>
                  <Star className="h-6 w-6 text-accent fill-accent" />
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-center mb-4">
                    <Image 
                      src={`https://placehold.co/100x100.png?text=${child.name[0]}`} 
                      alt={child.name}
                      data-ai-hint="child avatar"
                      width={80}
                      height={80}
                      className="rounded-full border-4 border-primary"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Age: {child.age}</p>
                  <p className="text-sm text-muted-foreground">Level: {child.level}</p>
                  <p className="text-lg font-bold text-accent">{child.stars} Stars <Star className="inline h-5 w-5 fill-accent" /></p>
                  <p className="text-sm text-muted-foreground">XP: {child.xp}</p>
                  <Link href={`/dashboard/child/${child.id}/manage`} passHref legacyBehavior>
                    <Button className="w-full mt-4">Manage {child.name}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckSquare className="text-primary"/> Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/tasks/new" passHref legacyBehavior><Button variant="outline" className="w-full justify-start">Assign a New Task</Button></Link>
            <Link href="/dashboard/rewards/new" passHref legacyBehavior><Button variant="outline" className="w-full justify-start">Create a Reward</Button></Link>
            <Link href="/dashboard/family" passHref legacyBehavior><Button variant="outline" className="w-full justify-start">Manage Family & Collaborators</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="text-accent"/> Task Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-3">Need inspiration? Use our AI Task Suggester!</p>
            <Link href="/dashboard/tasks" passHref legacyBehavior>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Sun className="mr-2 h-4 w-4"/> Get Task Suggestions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}