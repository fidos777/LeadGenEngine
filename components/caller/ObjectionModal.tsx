// components/caller/ObjectionModal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  OBJECTION_CATEGORIES,
  OBJECTION_LABELS,
  type ObjectionCategory,
} from "@/lib/leads/status";
import type { ObjectionFormData } from "@/types/caller";

interface ObjectionModalProps {
  companyName: string;
  onSubmit: (data: ObjectionFormData) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function ObjectionModal({
  companyName,
  onSubmit,
  onClose,
  isLoading,
}: ObjectionModalProps) {
  const [category, setCategory] = useState<ObjectionCategory | "">(
    ""
  );
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    onSubmit({
      category: category as ObjectionCategory,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-1">Not Interested</h2>
        <p className="text-sm text-gray-400 mb-4">{companyName}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Reason *
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ObjectionCategory | "")
              }
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white appearance-none cursor-pointer"
              required
              autoFocus
            >
              <option value="" disabled>
                Select reason...
              </option>
              {OBJECTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {OBJECTION_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Already signed with SolarEdge last month"
              rows={2}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 !bg-red-900/70 hover:!bg-red-900"
              disabled={isLoading || !category}
            >
              {isLoading ? "Saving..." : "Log Objection"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
