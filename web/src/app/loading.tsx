import LoadingSkeleton from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="w-full px-4 py-8">
      <LoadingSkeleton rows={4} variant="card" />
    </div>
  );
}
