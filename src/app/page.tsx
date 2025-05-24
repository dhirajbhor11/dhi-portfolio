
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChatLayout } from "@/components/chat/ChatLayout";
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function HomePage() {
  const { currentUser, userProfile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={userProfile?.photoURL ?? undefined} alt={userProfile?.displayName ?? 'User'} />
            <AvatarFallback>{userProfile?.displayName?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{userProfile?.displayName || currentUser.email}</p>
            <p className="text-xs text-muted-foreground">Role: {userProfile?.role || 'N/A'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={signOut} disabled={loading}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>
      <div className="flex-grow py-4 md:py-8">
        <ChatLayout />
      </div>
    </main>
  );
}
