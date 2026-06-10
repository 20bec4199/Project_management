import { Suspense } from "react";
import { AcceptInviteClient } from "./AcceptInviteClient";

function LoadingFallback() {
  return (
    <div className="text-center py-12">
      <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AcceptInviteClient />
    </Suspense>
  );
}
