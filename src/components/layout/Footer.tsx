export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 py-6">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-center text-sm text-muted-foreground md:flex-row md:text-left">
        <p>&copy; {new Date().getFullYear()} MiniHeroes. All rights reserved.</p>
        <p>
          Built with <span className="text-primary">♥</span> using Next.js and Firebase.
        </p>
      </div>
    </footer>
  );
}