"use client";

import type { LeadContactProfile } from "@/types/lead-detail";

interface ContactInfoProps {
  contact: LeadContactProfile | null;
}

export function ContactInfo({ contact }: ContactInfoProps) {
  if (!contact) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h3 className="text-sm font-medium text-neutral-400 mb-3">Contact</h3>
        <p className="text-neutral-500 text-sm">No contact assigned</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <h3 className="text-sm font-medium text-neutral-400 mb-3">Contact</h3>
      <dl className="space-y-2">
        {contact.full_name && (
          <div>
            <dt className="text-xs text-neutral-500">Name</dt>
            <dd className="text-sm text-white">{contact.full_name}</dd>
          </div>
        )}
        {contact.role && (
          <div>
            <dt className="text-xs text-neutral-500">Role</dt>
            <dd className="text-sm text-white">{contact.role}</dd>
          </div>
        )}
        {contact.phone && (
          <div>
            <dt className="text-xs text-neutral-500">Phone</dt>
            <dd className="text-sm text-white">
              <a
                href={`tel:${contact.phone}`}
                className="text-blue-400 hover:underline"
              >
                {contact.phone}
              </a>
            </dd>
          </div>
        )}
        {contact.email && (
          <div>
            <dt className="text-xs text-neutral-500">Email</dt>
            <dd className="text-sm text-white">
              <a
                href={`mailto:${contact.email}`}
                className="text-blue-400 hover:underline"
              >
                {contact.email}
              </a>
            </dd>
          </div>
        )}
        {contact.source && (
          <div>
            <dt className="text-xs text-neutral-500">Source</dt>
            <dd className="text-sm text-neutral-400 uppercase text-xs">
              {contact.source}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
