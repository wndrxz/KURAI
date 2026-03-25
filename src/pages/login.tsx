import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "../stores/auth";
import { Titlebar } from "../components/layout/titlebar";
import { Eye, EyeOff, Loader2, Check } from "lucide-react";

export default function LoginPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [remember, setRemember] = useState(true);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const { login, user } = useAuthStore();
	const navigate = useNavigate();
	const usernameRef = useRef<HTMLInputElement>(null);

	// Redirect if already authenticated
	useEffect(() => {
		if (user) {
			navigate("/", { replace: true });
		}
	}, [user, navigate]);

	// Auto-focus username input
	useEffect(() => {
		usernameRef.current?.focus();
	}, []);

	const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!canSubmit) return;

		setError("");
		setLoading(true);

		try {
			await login(username.trim(), password, remember);
			navigate("/", { replace: true });
		} catch (err) {
			setError(typeof err === "string" ? err : "Ошибка входа");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex h-screen flex-col bg-bg-root">
			<Titlebar />

			<div className="relative flex flex-1 items-center justify-center px-6">
				{/* Subtle radial glow behind form */}
				<div
					className="pointer-events-none absolute inset-0"
					style={{
						background:
							"radial-gradient(600px circle at 50% 40%, rgba(255, 255, 255, 0.015), transparent)",
					}}
				/>

				<form
					onSubmit={handleSubmit}
					className="relative z-10 flex w-full max-w-[320px] flex-col gap-4"
				>
					{/* Logo */}
					<div className="mb-6 text-center">
						<h1 className="text-5xl font-bold tracking-tighter text-text-primary">
							KURAI
						</h1>
						<p className="mt-2 text-sm text-text-secondary">
							Войдите в аккаунт Animix
						</p>
					</div>

					{/* Username */}
					<input
						ref={usernameRef}
						type="text"
						placeholder="Логин"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						disabled={loading}
						autoComplete="username"
						className="h-10 w-full rounded-lg border border-border bg-bg-card px-4 text-sm text-text-primary placeholder-text-muted outline-none transition-default focus:border-[#333] disabled:opacity-50"
					/>

					{/* Password */}
					<div className="relative">
						<input
							type={showPassword ? "text" : "password"}
							placeholder="Пароль"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							disabled={loading}
							autoComplete="current-password"
							className="h-10 w-full rounded-lg border border-border bg-bg-card px-4 pr-10 text-sm text-text-primary placeholder-text-muted outline-none transition-default focus:border-[#333] disabled:opacity-50"
						/>
						<button
							type="button"
							tabIndex={-1}
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-default hover:text-text-secondary"
						>
							{showPassword ? (
								<EyeOff size={16} />
							) : (
								<Eye size={16} />
							)}
						</button>
					</div>

					{/* Remember me */}
					<button
						type="button"
						onClick={() => setRemember(!remember)}
						className="flex items-center gap-2.5 self-start select-none"
					>
						<div
							className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-default ${
								remember
									? "border-accent bg-accent"
									: "border-border bg-bg-card"
							}`}
						>
							{remember && (
								<Check
									size={12}
									className="text-black"
									strokeWidth={3}
								/>
							)}
						</div>
						<span className="text-sm text-text-secondary">
							Запомнить
						</span>
					</button>

					{/* Error */}
					{error && (
						<div className="rounded-lg border border-error/20 bg-error/5 px-4 py-2.5">
							<p className="text-center text-sm text-error">
								{error}
							</p>
						</div>
					)}

					{/* Submit */}
					<button
						type="submit"
						disabled={!canSubmit}
						className="mt-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-black transition-default hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
					>
						{loading ? (
							<>
								<Loader2 size={16} className="animate-spin" />
								<span>Вход...</span>
							</>
						) : (
							<span>Войти</span>
						)}
					</button>
				</form>
			</div>
		</div>
	);
}