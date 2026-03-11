export const isWindows = (): boolean => process.platform === 'win32';
export const isMacOS = (): boolean => process.platform === 'darwin';
export const urlShortcutExtension = (): string => isMacOS() ? '.webloc' : '.url';
