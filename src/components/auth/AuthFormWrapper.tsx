
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DhiBotUserLogo } from '@/components/icons/DhiBotUserLogo';

interface AuthFormWrapperProps {
  title: string;
  description: string;
  children: ReactNode;
  footerContent?: ReactNode;
}

export function AuthFormWrapper({ title, description, children, footerContent }: AuthFormWrapperProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-primary">
            <DhiBotUserLogo className="h-full w-full" width={64} height={64} />
          </div>
          <CardTitle className="text-3xl font-bold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
          {footerContent && (
            <div className="mt-4 text-center text-sm">
              {footerContent}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
