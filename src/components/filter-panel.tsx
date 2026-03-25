import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

const COMMON_GENRES = [
	"Экшен",
	"Комедия",
	"Драма",
	"Фэнтези",
	"Романтика",
	"Приключения",
	"Сёнен",
	"Повседневность",
	"Школа",
	"Мистика",
	"Триллер",
	"Фантастика",
	"Сверхъестественное",
	"Исэкай",
	"Психологическое",
	"Спорт",
	"Меха",
	"Детектив",
];

export interface FilterValues {
	genres: string[];
	studio: string;
	minRating: number | null;
	maxRating: number | null;
	movie: boolean | null;
	hq: boolean | null;
}

export const emptyFilters: FilterValues = {
	genres: [],
	studio: "",
	minRating: null,
	maxRating: null,
	movie: null,
	hq: null,
};

export function hasActiveFilters(f: FilterValues): boolean {
	return (
		f.genres.length > 0 ||
		f.studio !== "" ||
		f.minRating !== null ||
		f.maxRating !== null ||
		f.movie !== null ||
		f.hq !== null
	);
}

interface FilterPanelProps {
	values: FilterValues;
	onChange: (v: FilterValues) => void;
	onApply: () => void;
}

export function FilterPanel({ values, onChange, onApply }: FilterPanelProps) {
	const [expanded, setExpanded] = useState(false);
	const active = hasActiveFilters(values);

	const toggleGenre = (g: string) => {
		const next = values.genres.includes(g)
			? values.genres.filter((x) => x !== g)
			: [...values.genres, g];
		onChange({ ...values, genres: next });
	};

	const update = (partial: Partial<FilterValues>) =>
		onChange({ ...values, ...partial });

	const clearAll = () => {
		onChange({ ...emptyFilters });
		onApply();
	};

	const activeCount =
		values.genres.length +
		(values.studio ? 1 : 0) +
		(values.minRating !== null || values.maxRating !== null ? 1 : 0) +
		(values.movie !== null ? 1 : 0) +
		(values.hq !== null ? 1 : 0);

	return (
		<div className="rounded-xl border border-border bg-bg-card">
			{/* Header */}
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex w-full items-center justify-between px-4 py-3 text-sm"
			>
				<div className="flex items-center gap-2">
					<span className="font-medium text-text-primary">
						Фильтры
					</span>
					{active && (
						<span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-black">
							{activeCount}
						</span>
					)}
				</div>
				{expanded ? (
					<ChevronUp size={16} className="text-text-muted" />
				) : (
					<ChevronDown size={16} className="text-text-muted" />
				)}
			</button>

			{/* Body */}
			{expanded && (
				<div className="flex flex-col gap-4 border-t border-border-subtle px-4 py-4">
					{/* Genres */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-medium text-text-secondary">
							Жанры
						</span>
						<div className="flex flex-wrap gap-1.5">
							{COMMON_GENRES.map((g) => (
								<button
									key={g}
									type="button"
									onClick={() => toggleGenre(g)}
									className={`rounded-md px-2.5 py-1 text-xs transition-default ${
										values.genres.includes(g)
											? "bg-accent text-black"
											: "bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary"
									}`}
								>
									{g}
								</button>
							))}
						</div>
					</div>

					{/* Studio */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-medium text-text-secondary">
							Студия
						</span>
						<input
							type="text"
							value={values.studio}
							onChange={(e) =>
								update({ studio: e.target.value })
							}
							placeholder="Например: MAPPA"
							className="rounded-md border border-border bg-bg-root px-3 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none transition-default focus:border-text-muted"
						/>
					</div>

					{/* Rating */}
					<div className="flex flex-col gap-2">
						<span className="text-xs font-medium text-text-secondary">
							Рейтинг
						</span>
						<div className="flex items-center gap-2">
							<input
								type="number"
								min={0}
								max={10}
								step={0.5}
								value={values.minRating ?? ""}
								onChange={(e) =>
									update({
										minRating: e.target.value
											? Number(e.target.value)
											: null,
									})
								}
								placeholder="от"
								className="w-20 rounded-md border border-border bg-bg-root px-3 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none transition-default focus:border-text-muted"
							/>
							<span className="text-xs text-text-muted">—</span>
							<input
								type="number"
								min={0}
								max={10}
								step={0.5}
								value={values.maxRating ?? ""}
								onChange={(e) =>
									update({
										maxRating: e.target.value
											? Number(e.target.value)
											: null,
									})
								}
								placeholder="до"
								className="w-20 rounded-md border border-border bg-bg-root px-3 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none transition-default focus:border-text-muted"
							/>
						</div>
					</div>

					{/* Flags */}
					<div className="flex gap-4">
						<label className="flex items-center gap-2 text-xs text-text-secondary">
							<input
								type="checkbox"
								checked={values.hq === true}
								onChange={(e) =>
									update({
										hq: e.target.checked ? true : null,
									})
								}
								className="accent-accent"
							/>
							HQ
						</label>
						<label className="flex items-center gap-2 text-xs text-text-secondary">
							<input
								type="checkbox"
								checked={values.movie === true}
								onChange={(e) =>
									update({
										movie: e.target.checked ? true : null,
									})
								}
								className="accent-accent"
							/>
							Фильм
						</label>
					</div>

					{/* Actions */}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onApply}
							className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-black transition-default hover:bg-accent-hover"
						>
							Применить
						</button>
						{active && (
							<button
								type="button"
								onClick={clearAll}
								className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-text-secondary transition-default hover:text-text-primary"
							>
								<X size={12} />
								Сбросить
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}