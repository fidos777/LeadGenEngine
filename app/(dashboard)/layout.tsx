export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* TODO: Add sidebar navigation */}
      <main>{children}</main>
    </div>
  );
}
