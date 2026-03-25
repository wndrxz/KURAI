export function Skeleton({
	className = "",
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={`animate-skeleton rounded-lg bg-bg-elevated ${className}`}
			{...props}
		/>
	);
}

export function CardSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			<Skeleton className="aspect-video w-full rounded-xl" />
			<Skeleton className="h-4 w-3/4" />
			<Skeleton className="h-3 w-1/2" />
		</div>
	);
}

export function GridSkeleton({ count = 10 }: { count?: number }) {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
			{Array.from({ length: count }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders with no identity
				<CardSkeleton key={i} />
			))}
		</div>
	);
}

export function RowSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="flex gap-4 overflow-hidden">
			{Array.from({ length: count }).map((_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders with no identity
				<div key={i} className="w-[200px] shrink-0">
					<CardSkeleton />
				</div>
			))}
		</div>
	);
}