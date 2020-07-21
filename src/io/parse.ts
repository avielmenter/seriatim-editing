import { List, Map } from 'immutable';

import { Document, removeItem } from './document';
import { Item, ItemID, CursorPosition } from './document/item';
import Style, { validateUnitType } from './document/style';

import { Event } from './events';
import * as DocumentReducer from './document/reducers';
import * as ItemReducer from './document/reducers/item';

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
        default:
            return undefined;
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

function parseActionType<T extends DocumentReducer.Action | ItemReducer.Action>(raw: any, dataTypes: { [key: string]: string } = {}): T | undefined {
    if (!raw?.type)
        return undefined;

    const data = Object.keys(dataTypes).reduce(
        (p: any, c) => {
            if (p === undefined)
                return undefined;

            let param = (typeof raw[c] == dataTypes[c]) && raw[c];

            if (c == "item")
                param = parseItem(raw[c]);
            else if (c == "document")
                param = parseDocument(raw[c]);
            else if (c == "style")
                param = parseStyle(raw[c]);

            if (!param)
                return undefined;

            return { ...p, [c]: param };
        }, {}
    );

    return !data ? undefined : { type: raw.type, data } as T;
}

function parseItemAction<T extends ItemReducer.Action>(raw: any): ItemReducer.Action | undefined {
    const action = raw as ItemReducer.Action;
    if (!raw?.type)
        return undefined;

    switch (action.type) {
        case "AddImage":
        case "AddURL":
        case "BlockQuote":
        case "ClearFormatting":
        case "EmboldenItem":
        case "ItalicizeItem":
        case "Unquote":
            return parseActionType(raw);
        case "ClearStyle":
            return parseActionType(raw, { style: "string" });
        case "UpdateCursor":
            const cp = raw?.cursorPosition;
            const start = cp?.start;
            const length = cp?.length;
            const synced = cp?.synced;

            if (cp && (typeof start != "number" || typeof length != "number" || typeof synced != "boolean"))
                return undefined;

            return { type: "UpdateCursor", data: { cursorPosition: cp ? { start, length, synced } : undefined } };
        case "UpdateItemText":
            return parseActionType(raw, { newText: "string" });
        case "UpdateStyle":
            return parseActionType(raw, { style: "style" });
        default:
            return undefined;
    }
}

function parseAction(raw: any): DocumentReducer.Action | undefined {
    const action = raw as DocumentReducer.Action;
    if (!action?.type)
        return undefined;

    switch (action.type) {
        case "AddItemAfterSibling":
            return parseActionType(raw, { focusOnNew: "boolean", sibling: "item" })
        case "AddItemToParent":
            return parseActionType(raw, { parent: "item" });
        case "IndentItem":
            return parseActionType(raw, { item: "item" });
        case "IndentSelection":
            return parseActionType(raw);
        case "InitializeDocument":
            const idType = raw.type;
            const idDocument = parseDocument(raw?.data?.document) || null;
            return idType ? { type: "InitializeDocument", data: { document: idDocument } } : undefined;
        case "MakeHeader":
            return parseActionType(raw, { item: "item" });
        case "MakeItem":
            return parseActionType(raw, { item: "item" });
        case "MakeSelectionHeader":
        case "MakeSelectionItem":
        case "MarkSaved":
        case "MarkUnsaved":
            return parseActionType(raw);
        case "MultiSelect":
            return { type: "MultiSelect", data: { item: raw?.data?.item } }
        case "Paste":
            return parseActionType(raw, { item: "item", clipboard: "document" });
        case "RefreshTableOfContents":
            return parseActionType(raw);
        case "RemoveItem":
            return parseActionType(raw, { item: "item" });
        case "RemoveSelection":
            return parseActionType(raw);
        case "ToggleItemCollapse":
            return parseActionType(raw, { item: "item " });
        case "UnindentItem":
            return parseActionType(raw, { item: "item " });
        case "UnindentSelection":
            return parseActionType(raw);
        case "UpdateItem":
            const uiType = raw.type;
            const uiItem = parseItem(raw?.data?.item);
            const uiAction = parseItemAction(raw?.data?.action);

            if (!uiItem || !uiAction)
                return undefined;

            return { type: "UpdateItem", data: { item: uiItem, action: uiAction } };
        case "UpdateItemIDs":
            const newIDs = raw.newIDs && Map<ItemID, ItemID>(raw.newIDs);
            return { type: "UpdateItemIDs", data: { newIDs } };
        case "UpdateSelection":
            const usType = raw.type;
            const usAction = parseItemAction(raw?.data?.action);

            if (!usType || !usAction)
                return undefined;

            return { type: "UpdateSelection", data: { action: usAction } };
        default:
            return undefined;
    }
}

export function parseEvent(raw: any): Event | undefined {
    if (!raw || !raw.code)
        return undefined;

    switch (raw.code) {
        case "UPDATE_DOCUMENT":
            const action = parseAction(raw?.data);
            if (!action)
                return undefined;
            return { code: "UPDATE_DOCUMENT", data: action };
        default:
            return undefined;
    }
}