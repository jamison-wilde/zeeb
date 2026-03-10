import { Platform } from 'react-native';

export const isWindows = (): boolean => Platform.OS === 'windows';
export const isMacOS = (): boolean => Platform.OS === 'macos';
export const urlShortcutExtension = (): string => isMacOS() ? '.webloc' : '.url';
