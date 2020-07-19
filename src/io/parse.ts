import { List, Map } from 'immutable';

import { Document } from './document';
import { Item, ItemID, CursorPosition } from './document/item';
import Style, { validateUnitType } from './document/style';

import { Event } from './events';

const parseMap = <T>(raw: { [key: string]: any }, parse: (raw: any) => T | undefined) => Map<string, T>(
    Object.keys(raw)
        .map(k => ([k, parse(raw[k])] as [string, T]))
        .filter((kvp): kvp is [string, T] => kvp[1] !== undefined)
);

const parseList = <T>(raw: T[], parse: (raw: any) => T | undefined) => List<T>(
    raw.map(r => parse(r)).filter((r): r is T => r != undefined)
)

function parseStyle(raw: any): Style | undefined {
    if (!raw)
        return undefined;

    const property = raw.property;
    switch (property) {
        case "backgroundColor":
        case "color":
            const svalue = raw.value;
            if (typeof svalue != "string")
                return undefined;
            return { property, value: svalue };
        case "fontSize":
        case "lineHeight":
            const nvalue = raw.value;
            const unit = raw.unit;
            if (typeof nvalue != "number" || !validateUnitType(unit))
                return undefined;
            return { property, value: nvalue, unit }
    }
}

function parseCursorPosition(raw: any): CursorPosition | undefined {
    if (!raw)
        return undefined;

    const start = raw.start;
    const length = raw.length;
    const synced = raw.synced;

    if (typeof start != "number" || typeof length != "number" || typeof synced != "boolean")
        return undefined;

    return { start, length, synced };
}

function parseItem(raw: any): Item | undefined {
    if (!raw)
        return undefined;

    const itemID = raw.itemID;
    const parentID = raw.parentID;
    const text = raw.text;
    const children = raw.children && raw.children.filter((c: any): c is ItemID => typeof c == "string");
    const styles = raw.styles && parseMap(raw.styles, parseStyle);

    const collapsed = raw.view?.collapsed;
    const cursorPosition = parseCursorPosition(raw.cursorPosition);

    if (typeof collapsed != "boolean" || !cursorPosition)
        return undefined;

    const view = { collapsed, cursorPosition };

    if (typeof itemID != "string" || typeof parentID != "string" || typeof text != "string" || !children || !styles)
        return undefined;

    return {
        itemID,
        parentID,
        text,
        children,
        styles,
        view
    }
}

export function parseDocument(raw: any): Document | undefined {
    if (!raw)
        return undefined;

    const documentID = raw.documentID;
    const lastModified = raw.lastModified;
    const title = raw.title;
    const rootItemID = raw.rootItemID;
    const tableOfContentsItemID = raw.tableOfContentsItemID;
    const focusedItemID = raw.focusedItemID;
    const editedSinceSave = raw.editedSinceSave;

    const start = raw.selection?.start;
    const end = raw.selection?.end;

    const selection = raw.selection && (typeof start == "string" && typeof end == "string")
        ? { start, end }
        : undefined;

    const items = raw.items && parseMap(raw.items, parseItem);

    if (typeof documentID != "string"
        || !lastModified
        || typeof title != "string"
        || typeof rootItemID != "string"
        || (typeof tableOfContentsItemID != "string" && typeof tableOfContentsItemID != "undefined")
        || (typeof focusedItemID != "string" && typeof focusedItemID != "undefined")
        || typeof editedSinceSave != "boolean")
        return undefined;

    return {
        documentID,
        lastModified,
        title,
        rootItemID,
        tableOfContentsItemID,
        focusedItemID,
        editedSinceSave,
        items,
        selection
    }
}

export function parseEvent(raw: any): Event | undefined {
    if (!raw || !raw.code)
        return undefined;

    switch (raw.code) {
        case "UPDATE_IDS":
            const ids = raw.data && parseMap(raw.data, (s) => s).filter((v): v is ItemID => typeof v == "string");
            return { code: "UPDATE_IDS", data: ids }
        case "UPDATE_ITEMS":
            const items = raw.data && parseList(raw.data, parseItem);
            return { code: "UPDATE_ITEMS", data: items };
        default:
            return undefined;
    }
}