// Esqueletos de carregamento: hero + fileiras com 6 cards cinza pulsando.

export function HeroSkeleton() {
  return (
    <div className="aspect-video max-h-[80vh] min-h-[50vh] w-full animate-pulse bg-neutral-900">
      <div className="absolute bottom-0 left-0 space-y-3 p-4 sm:p-8">
        <div className="h-10 w-64 rounded bg-neutral-800" />
        <div className="h-4 w-80 rounded bg-neutral-800" />
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-32 rounded bg-neutral-800" />
          <div className="h-10 w-40 rounded bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <section className="py-4">
      <div className="mb-2 px-4 sm:px-8">
        <div className="h-5 w-56 animate-pulse rounded bg-neutral-800" />
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-hidden px-4 sm:gap-3 sm:px-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-video w-[120px] shrink-0 animate-pulse rounded-md bg-neutral-800 sm:w-[150px] lg:w-[200px]"
          />
        ))}
      </div>
    </section>
  );
}

export function HomeSkeleton() {
  return (
    <div>
      <HeroSkeleton />
      <div className="mt-2">
        <CarouselSkeleton />
        <CarouselSkeleton />
        <CarouselSkeleton />
        <CarouselSkeleton />
      </div>
    </div>
  );
}
