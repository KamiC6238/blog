import { DARK_MODE_KEY, DARK, LIGHT } from '../constants';

export const getHTMLNode = () => document.getElementsByTagName('html')[0];

export const addDark = () => getHTMLNode().classList.add(DARK)
export const removeDark = () => getHTMLNode().classList.remove(DARK);

export const addLight = () => getHTMLNode().classList.add(LIGHT)
export const removeLight = () => getHTMLNode().classList.remove(LIGHT);

export const getModeFromLocal = () => window.localStorage.getItem(DARK_MODE_KEY);
export const setModeToLocal = (mode: string) => window.localStorage.setItem(DARK_MODE_KEY, mode);