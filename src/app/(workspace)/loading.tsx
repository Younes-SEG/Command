export default function Loading() {
  return (
    <div aria-label="Loading workspace" className="space-y-6">
      <div className="skeleton h-9 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((x) => (
          <div className="skeleton h-32" key={x} />
        ))}
      </div>
      <div className="skeleton h-80" />
    </div>
  );
}
