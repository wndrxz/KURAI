import { useRef, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { SEARCH_DEBOUNCE } from "../lib/constants";

interface SearchBarProps {
	value: string;
	onChange: (query: string) => void;
	placeholder?: string;
}

export function SearchBar({
	value,
	onChange,
	placeholder = "Поиск аниме...",
}: SearchBarProps) {
	const [local, setLocal] = useState(value);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	useEffect(() => {
		setLocal(value);
	}, [value]);

	const handleInput = (val: string) => {
		setLocal(val);
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(
			() => onChangeRef.current(val),
			SEARCH_DEBOUNCE,
		);
	};

	const clear = () => {
		setLocal("");
		if (timerRef.current) clearTimeout(timerRef.current);
		onChangeRef.current("");
	};

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	return (
		<div className="relative">
			<Search
				size={16}
				className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
			/>
			<input
				type="text"
				value={local}
				onChange={(e) => handleInput(e.target.value)}
				placeholder={placeholder}
				className="w-full rounded-lg border border-border bg-bg-card py-2.5 pr-9 pl-9 text-sm text-text-primary placeholder-text-muted outline-none transition-default focus:border-text-muted"
			/>
			{local && (
				<button
					type="button"
					onClick={clear}
					className="absolute top-1/2 right-3 -translate-y-1/2 text-text-muted transition-default hover:text-text-secondary"
				>
					<X size={14} />
				</button>
			)}
		</div>
	);
}