// app/caller/layout.tsx
export default function CallerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-3">
        <h1 className="text-lg font-semibold">Call Queue</h1>
      </header>
      <main className="pb-20">{children}</main>
    </div>
  );
}
