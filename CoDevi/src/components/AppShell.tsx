import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({
  title,
  back,
  children,
  right,
}: {
  title?: string;
  back?: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md">
        {(title || back) && (
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
            {back ? (
              <Link to={back} className="rounded-md p-1 hover:bg-accent">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : null}
            <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
            {right}
          </header>
        )}
        <main className="px-4 pb-24 pt-4">{children}</main>
      </div>
    </div>
  );
}
