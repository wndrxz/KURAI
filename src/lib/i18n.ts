import { useSettingsStore } from "../stores/settings";

export type Lang = "ru" | "en";

const dict: Record<Lang, Record<string, string>> = {
	ru: {
		// ── Navigation ──
		"nav.home": "Главная",
		"nav.catalog": "Каталог",
		"nav.collections": "Коллекции",
		"nav.history": "История",
		"nav.marathon": "Марафон",
		"nav.settings": "Настройки",

		// ── Auth ──
		"auth.login": "Войти",
		"auth.logout": "Выйти",
		"auth.username": "Логин",
		"auth.password": "Пароль",
		"auth.remember": "Запомнить",
		"auth.error": "Неверный логин или пароль",

		// ── Common ──
		"common.loading": "Загрузка...",
		"common.error": "Ошибка",
		"common.save": "Сохранить",
		"common.cancel": "Отмена",
		"common.reset": "Сбросить",
		"common.loadMore": "Загрузить ещё",
		"common.noData": "Нет данных",
		"common.sec": "сек",

		// ── Player ──
		"player.skip": "Пропустить",
		"player.watch": "Смотреть",
		"player.next": "Следующий эпизод",

		// ── Settings ──
		"settings.title": "Настройки",
		"settings.account": "Аккаунт",
		"settings.player": "Плеер",
		"settings.marathonSection": "Марафон",
		"settings.hotkeys": "Горячие клавиши",
		"settings.app": "Приложение",
		"settings.about": "О программе",

		"settings.nickname": "Ник",
		"settings.region": "Регион",
		"settings.watched": "Просмотрено серий",
		"settings.subscription": "Подписка",
		"settings.subscriptionActive": "Активна",
		"settings.subscriptionNone": "Нет",

		"settings.defaultQuality": "Качество по умолчанию",
		"settings.autoNext": "Авто-следующий эпизод",
		"settings.nextCountdown": "Задержка следующего",
		"settings.skipMode": "Пропуск опенинга/эндинга",
		"settings.skipModeAuto": "Автоматически",
		"settings.skipModeButton": "Кнопка",
		"settings.skipModeOff": "Выключен",
		"settings.skipTimeout": "Время показа кнопки",

		"settings.marathonDelayMin": "Мин. задержка между эпизодами",
		"settings.marathonDelayMax": "Макс. задержка между эпизодами",
		"settings.marathonMode": "Режим по умолчанию",
		"settings.marathonModeHeadless": "Фоновый",
		"settings.marathonModeVideo": "С видео",
		"settings.marathonQuality": "Качество (фоновый режим)",

		"settings.language": "Язык",
		"settings.closeToTray": "Сворачивать в трей",
		"settings.autostart": "Запуск с системой",
		"settings.notifications": "Системные уведомления",

		"settings.version": "Версия",
		"settings.checkUpdates": "Проверить обновления",
		"settings.noUpdates": "Обновлений нет",
		"settings.resetHotkeys": "Сбросить к дефолтным",
		"settings.pressKey": "Нажмите клавишу...",

		// ── Hotkey labels ──
		"hotkey.playPause": "Воспроизведение / Пауза",
		"hotkey.seekBack": "Перемотка −5 сек",
		"hotkey.seekForward": "Перемотка +5 сек",
		"hotkey.seekBackLong": "Перемотка −30 сек",
		"hotkey.seekForwardLong": "Перемотка +30 сек",
		"hotkey.volumeUp": "Громкость +",
		"hotkey.volumeDown": "Громкость −",
		"hotkey.mute": "Без звука",
		"hotkey.fullscreen": "Полноэкранный режим",
		"hotkey.nextEp": "Следующий эпизод",
		"hotkey.prevEp": "Предыдущий эпизод",
		"hotkey.skip": "Пропустить опенинг/эндинг",
		"hotkey.search": "Быстрый поиск",
		"hotkey.settings": "Настройки",

		// ── History ──
		"history.title": "История",
		"history.season": "Сезон",
		"history.episode": "Серия",
		"history.empty": "История просмотров пуста",
		"history.watched": "Просмотрено",
		"history.inProgress": "В процессе",

		// ── Collections ──
		"collections.title": "Коллекции",
		"collections.empty": "В этой коллекции пока ничего нет",
		"collections.watching": "В процессе",
		"collections.completed": "Просмотрено",
		"collections.planned": "В планах",
		"collections.onHold": "Отложено",
		"collections.dropped": "Брошено",
	},

	en: {
		"nav.home": "Home",
		"nav.catalog": "Catalog",
		"nav.collections": "Collections",
		"nav.history": "History",
		"nav.marathon": "Marathon",
		"nav.settings": "Settings",

		"auth.login": "Log in",
		"auth.logout": "Log out",
		"auth.username": "Username",
		"auth.password": "Password",
		"auth.remember": "Remember me",
		"auth.error": "Invalid username or password",

		"common.loading": "Loading...",
		"common.error": "Error",
		"common.save": "Save",
		"common.cancel": "Cancel",
		"common.reset": "Reset",
		"common.loadMore": "Load more",
		"common.noData": "No data",
		"common.sec": "sec",

		"player.skip": "Skip",
		"player.watch": "Watch",
		"player.next": "Next episode",

		"settings.title": "Settings",
		"settings.account": "Account",
		"settings.player": "Player",
		"settings.marathonSection": "Marathon",
		"settings.hotkeys": "Hotkeys",
		"settings.app": "Application",
		"settings.about": "About",

		"settings.nickname": "Nickname",
		"settings.region": "Region",
		"settings.watched": "Episodes watched",
		"settings.subscription": "Subscription",
		"settings.subscriptionActive": "Active",
		"settings.subscriptionNone": "None",

		"settings.defaultQuality": "Default quality",
		"settings.autoNext": "Auto-next episode",
		"settings.nextCountdown": "Next episode delay",
		"settings.skipMode": "Skip intro/outro",
		"settings.skipModeAuto": "Automatic",
		"settings.skipModeButton": "Button",
		"settings.skipModeOff": "Disabled",
		"settings.skipTimeout": "Skip button timeout",

		"settings.marathonDelayMin": "Min delay between episodes",
		"settings.marathonDelayMax": "Max delay between episodes",
		"settings.marathonMode": "Default mode",
		"settings.marathonModeHeadless": "Background",
		"settings.marathonModeVideo": "With video",
		"settings.marathonQuality": "Quality (background mode)",

		"settings.language": "Language",
		"settings.closeToTray": "Close to tray",
		"settings.autostart": "Start with system",
		"settings.notifications": "System notifications",

		"settings.version": "Version",
		"settings.checkUpdates": "Check for updates",
		"settings.noUpdates": "No updates available",
		"settings.resetHotkeys": "Reset to defaults",
		"settings.pressKey": "Press a key...",

		"hotkey.playPause": "Play / Pause",
		"hotkey.seekBack": "Seek −5s",
		"hotkey.seekForward": "Seek +5s",
		"hotkey.seekBackLong": "Seek −30s",
		"hotkey.seekForwardLong": "Seek +30s",
		"hotkey.volumeUp": "Volume up",
		"hotkey.volumeDown": "Volume down",
		"hotkey.mute": "Mute",
		"hotkey.fullscreen": "Fullscreen",
		"hotkey.nextEp": "Next episode",
		"hotkey.prevEp": "Previous episode",
		"hotkey.skip": "Skip intro/outro",
		"hotkey.search": "Quick search",
		"hotkey.settings": "Settings",

		"history.title": "History",
		"history.season": "Season",
		"history.episode": "Episode",
		"history.empty": "Watch history is empty",
		"history.watched": "Watched",
		"history.inProgress": "In progress",

		"collections.title": "Collections",
		"collections.empty": "This collection is empty",
		"collections.watching": "Watching",
		"collections.completed": "Completed",
		"collections.planned": "Planned",
		"collections.onHold": "On Hold",
		"collections.dropped": "Dropped",
	},
};

/** Map API collection names → i18n keys */
export const COLLECTION_I18N: Record<string, string> = {
	"В процессе": "collections.watching",
	"Просмотрено": "collections.completed",
	"В планах": "collections.planned",
	"Отложено": "collections.onHold",
	"Брошено": "collections.dropped",
};

/** Translate by key using current language from store */
export function useTranslation() {
	const language = useSettingsStore((s) => s.language);
	return {
		t: (key: string): string => dict[language]?.[key] ?? key,
		lang: language,
	};
}

/** Static translate (for use outside React) */
export function t(key: string, lang: Lang = "ru"): string {
	return dict[lang]?.[key] ?? key;
}