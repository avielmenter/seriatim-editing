import Style from './style';

import { List, Set, Map } from 'immutable';

export type ItemID = string;
export type ItemType = "Header" | "Item" | "Title";

export type CursorPosition = {
	start: number,
	length: number,
	synced: boolean,
}

export type Item = {
	readonly itemID: ItemID,
	readonly parentID: ItemID,
	readonly text: string,
	readonly children: List<ItemID>,
	readonly styles: Map<string, Style>,
	readonly view: {
		readonly collapsed: boolean,
		readonly cursorPosition?: CursorPosition
	}
}

export type ListItem = {
	readonly item: Item,
	readonly focused: boolean,
	readonly selected: boolean,
	readonly indent: number,
	readonly itemType: ItemType,
	readonly isTableOfContents: boolean
}

const ID_POOL_SIZE = 1000;
let ID_POOL = Set<ItemID>();

function __generateItemID(): ItemID { 	// copied from https://stackoverflow.com/a/105074 
	function s4(): string {				// NOT GUARANTEED TO BE GLOBALLY UNIQUE
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}

	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function refreshIDPool(): void {
	if (ID_POOL.count() > ID_POOL_SIZE / 2)
		return;

	while (ID_POOL.count() < ID_POOL_SIZE)
		ID_POOL = ID_POOL.add(__generateItemID());
}

function generateItemID(): ItemID | undefined {
	refreshIDPool();

	const newID = ID_POOL.first(undefined);
	if (!newID)
		return undefined;

	ID_POOL = ID_POOL.remove(newID);
	return newID;
}

export function newItemFromParent(parent: Item): Item | undefined {
	const itemID = generateItemID();
	if (!itemID)
		return undefined;

	return {
		itemID,
		parentID: parent.itemID,
		text: "",
		children: List<ItemID>([]),
		styles: Map<string, Style>(),
		view: {
			collapsed: false
		}
	}
}

export function regenerateID(item: Item): Item {
	return {
		...item,
		itemID: generateItemID() || item.itemID
	}
}

export function getHeaderLevel(item: Item): number {
	const numHashes = List(item.text)
		.takeWhile(c => c == '#')
		.count();

	return item.text.length > numHashes && item.text[numHashes] == ' '
		? numHashes
		: 0;
}

export const changeStyle = (item: Item, style: Style): Item => ({
	...item,
	styles: item.styles.set(style.property, style)
});

// export const getReactStyles = (item: Item): React.CSSProperties => item.styles.reduce((prev, curr) => ({
// 	...prev,
// 	[curr.property]: toValueString(curr)
// }), {});