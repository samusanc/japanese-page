/**
 * Ordered character roster. To add a character: create a file in this folder
 * following the CharacterDefinition schema (see ../../types.js) and list it
 * here. Explicit imports (not import.meta.glob) so plain node scripts —
 * like the audio manifest generator — can load content without Vite.
 */
import prince from './prince.js';
import knight from './knight.js';
import earl from './earl.js';
import archduke from './archduke.js';
import duchess from './duchess.js';

export const CHARACTERS = [prince, knight, earl, archduke, duchess];
