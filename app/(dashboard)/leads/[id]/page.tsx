import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getUserRoleUnsafe } from "@/lib/auth/getUserRole";
import { canAccess } from "@/lib/auth/permissions";
import type { LeadDetailResponse } from "@/types/lead-detail";
import type { LeadAssistResponse } from "@/lib/assist";
import {
  LeadHeader,
  CompanyProfile,
  ContactInfo,
  QualificationChecklist,
  ActivityTimeline,
  ExecutionController,
  AssistPanel,
} from "@/components/lead-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchWithCookies<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function LeadDetailPage({ params }: PageProps) {
  const role = await getUserRoleUnsafe();
  const { id } = await params;

  if (!role) {
    redirect("/login");
  }

  if (!canAccess(role, "leads", "read")) {
    redirect("/unauthorized");
  }

  // Parallel fetch: lead detail + assist data
  const [lead, assist] = await Promise.all([
    fetchWithCookies<LeadDetailResponse>(`/api/v1/leads/${id}`),
    fetchWithCookies<LeadAssistResponse>(`/api/v1/leads/${id}/assist`),
  ]);

  if (!lead) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <LeadHeader
        companyName={lead.company?.name ?? null}
        status={lead.status}
        score={lead.score}
        opportunityType={lead.opportunity_type}
      />

      {/* Main Content - 3 Panel Layout */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Profile */}
          <div className="lg:col-span-3 space-y-4">
            <CompanyProfile company={lead.company} />
            <ContactInfo contact={lead.contact} />
            <QualificationChecklist qualification={lead.qualification} />
          </div>

          {/* Center Panel - Timeline */}
          <div className="lg:col-span-6">
            <ActivityTimeline activities={lead.activities} />

            {/* Notes Section */}
            {lead.notes && (
              <div className="mt-4 p-4 bg-neutral-900 rounded-lg">
                <h3 className="text-sm font-medium text-neutral-400 mb-2">
                  Notes
                </h3>
                <p className="text-sm text-neutral-300 whitespace-pre-wrap">
                  {lead.notes}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel - Actions + Health */}
          <div className="lg:col-span-3 space-y-4">
            {/* Lead Health / Assist Panel */}
            <AssistPanel assist={assist} />

            {/* Execution Controller */}
            <ExecutionController
              leadId={lead.id}
              currentStatus={lead.status}
              qualificationComplete={lead.qualification?.complete ?? false}
            />

            {/* Metadata */}
            <div className="p-4 bg-neutral-900 rounded-lg">
              <h3 className="text-sm font-medium text-neutral-400 mb-2">
                Metadata
              </h3>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Created</dt>
                  <dd className="text-neutral-300">
                    {new Date(lead.created_at).toLocaleDateString("en-MY")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Updated</dt>
                  <dd className="text-neutral-300">
                    {new Date(lead.updated_at).toLocaleDateString("en-MY")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Lead ID</dt>
                  <dd className="text-neutral-500 font-mono">
                    {lead.id.slice(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
