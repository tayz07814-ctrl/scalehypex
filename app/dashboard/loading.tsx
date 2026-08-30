export default function DashboardLoading() {
  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-[#F3E8E1]" />
          <div className="h-4 w-72 animate-pulse rounded bg-[#F3E8E1]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-[#F6E9DF] bg-white"
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl border border-[#F6E9DF] bg-white" />
          <div className="h-56 animate-pulse rounded-2xl border border-[#F6E9DF] bg-white" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-[#F6E9DF] bg-white" />
      </div>
    </main>
  )
}