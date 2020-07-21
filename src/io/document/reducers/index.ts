import { Range, List, Map } from 'immutable';

import * as Item from '../item';
import * as Document from '..';

import * as ItemReducers from './item';

// ACTION TYPES

export type AddItemToParent = {
    type: "AddItemToParent",
    data: {
        parent: Item.Item
    }
}

export type AddItemAfterSibling = {
    type: "AddItemAfterSibling",
    data: {
        sibling: Item.Item,
        focusOnNew: boolean
    }
}

export type InitializeDocument = {
    type: "InitializeDocument",
    data: {
        document: Document.Document | null
    }
}

export type ToggleItemCollapse = {
    type: "ToggleItemCollapse",
    data: {
        item: Item.Item
    }
}

export type RemoveItem = {
    type: "RemoveItem",
    data: {
        item: Item.Item
    }
}

export type SetFocus = {
    type: "SetFocus",
    data: {
        item: Item.Item | undefined
    }
}

export type IncrementFocus = {
    type: "IncrementFocus",
    data: {
        createNewItem: boolean
    }
}

export type DecrementFocus = {
    type: "DecrementFocus",
    data: {}
}

export type IndentItem = {
    type: "IndentItem",
    data: {
        item: Item.Item
    }
}

export type UnindentItem = {
    type: "UnindentItem",
    data: {
        item: Item.Item
    }
}

export type MakeHeader = {
    type: "MakeHeader",
    data: {
        item: Item.Item
    }
}

export type MakeItem = {
    type: "MakeItem",
    data: {
        item: Item.Item
    }
}

export type MultiSelect = {
    type: "MultiSelect",
    data: {
        item: Item.Item | undefined
    }
}

export type MakeSelectionItem = {
    type: "MakeSelectionItem",
    data: {}
}

export type MakeSelectionHeader = {
    type: "MakeSelectionHeader",
    data: {}
}

export type RemoveSelection = {
    type: "RemoveSelection",
    data: {}
}

export type IndentSelection = {
    type: "IndentSelection",
    data: {}
}

export type UnindentSelection = {
    type: "UnindentSelection",
    data: {}
}

export type AddTableOfContents = {
    type: "AddTableOfContents",
    data: {}
}

export type RefreshTableOfContents = {
    type: "RefreshTableOfContents",
    data: {}
}

export type UpdateItem = {
    type: "UpdateItem",
    data: {
        item: Item.Item,
        action: ItemReducers.Action
    }
}

export type UpdateSelection = {
    type: "UpdateSelection",
    data: {
        action: ItemReducers.Action
    }
}

export type UpdateItemIDs = {
    type: "UpdateItemIDs",
    data: {
        newIDs: Map<Item.ItemID, Item.ItemID>
    }
}

export type Paste = {
    type: "Paste",
    data: {
        item: Item.Item,
        clipboard: Document.Document
    }
}

export type MarkSaved = {
    type: "MarkSaved",
    data: {}
}

export type MarkUnsaved = {
    type: "MarkUnsaved",
    data: {}
}

export type Action
    = AddItemToParent
    | AddItemAfterSibling
    | InitializeDocument
    | ToggleItemCollapse
    | RemoveItem
    | SetFocus
    | IncrementFocus
    | DecrementFocus
    | IndentItem
    | UnindentItem
    | MakeHeader
    | MakeItem
    | MakeSelectionItem
    | MakeSelectionHeader
    | RemoveSelection
    | IndentSelection
    | UnindentSelection
    | AddTableOfContents
    | RefreshTableOfContents
    | MultiSelect
    | UpdateItem
    | UpdateSelection
    | UpdateItemIDs
    | Paste
    | MarkSaved
    | MarkUnsaved;

// REDUCERS

function addItemToParent(document: Document.Document | null, action: AddItemToParent): Document.Document | null {
    if (!document)
        return null;

    return {
        ...Document.addItem(document, action.data.parent),
        editedSinceSave: true
    };
}

function addItemAfterSibling(document: Document.Document | null, action: AddItemAfterSibling): Document.Document | null {
    if (!document)
        return null;

    const { sibling, focusOnNew } = action.data;
    const parent = document.items.get(sibling.parentID);
    if (!parent)
        return document;

    const indexOfSibling = parent.children.findIndex(sid => sid == sibling.itemID);
    if (indexOfSibling == -1)
        return document;

    const item = Item.newItemFromParent(parent);
    const newDocument = {
        ...Document.addItem(document, parent, indexOfSibling + 1, item),
        editedSinceSave: true
    };

    return focusOnNew ?
        setFocus(newDocument, { type: "SetFocus", data: { item } }) :
        newDocument;
}

function toggleItemCollapse(document: Document.Document | null, action: ToggleItemCollapse): Document.Document | null {
    if (!document)
        return null;

    const item = action.data.item;
    if (item.children.count() <= 0)
        return document;

    return Document.updateItems(document, {
        ...item,
        view: {
            ...item.view,
            collapsed: !item.view.collapsed
        }
    });
}

function removeItem(document: Document.Document | null, action: RemoveItem): Document.Document | null {
    if (!document)
        return null;
    else if (!document.items.get(action.data.item.itemID) || action.data.item.itemID == document.rootItemID)
        return document;

    const item = action.data.item;
    const nextItem = Document.getNextItem(document, item);
    const prevSibling = Document.getPrevSibling(document, item);

    const children = item.children
        .flatMap(childID => {
            const child = document.items.get(childID);
            return child ? [child] : []
        });

    let newDocument = { ...document, editedSinceSave: true };

    if (prevSibling) {
        newDocument = children.reduce((prev, curr) => {
            const newParent = prev.items.get(prevSibling.itemID);
            if (!newParent)
                return prev;

            return Document.moveItem(prev, newParent, Infinity, curr).document
        }, newDocument);
    } else {
        newDocument = children.reverse().reduce((prev, curr) => Document.unindentItem(prev, curr).document, newDocument);
    }

    newDocument = Document.removeItem(newDocument, item, false);
    if (item.itemID == newDocument.tableOfContentsItemID)
        newDocument.tableOfContentsItemID = undefined;

    return (newDocument.focusedItemID == item.itemID) ? setFocus(newDocument, { type: "SetFocus", data: { item: nextItem } }) : newDocument;
}

function setFocus(document: Document.Document | null, action: SetFocus): Document.Document | null {
    if (!document)
        return null;

    const item = action.data.item;

    return {
        ...document,
        focusedItemID: (item == undefined ? undefined : item.itemID)
    };
}

function incrementFocus(document: Document.Document | null, action: IncrementFocus): Document.Document | null {
    if (!document)
        return null;

    const focusedItem = document.items.get(document.focusedItemID || "");
    if (!focusedItem)
        return setFocus(document, { type: "SetFocus", data: { item: document.items.get(document.rootItemID) } });

    const { createNewItem } = action.data;
    const focusedParent = focusedItem.itemID == document.rootItemID ?
        { ...focusedItem } :
        (document.items.get(focusedItem.parentID) || { ...focusedItem });

    const nextItem = Document.getNextItem(document, focusedItem, true);
    if (nextItem != undefined) {
        return setFocus(document, { type: "SetFocus", data: { item: nextItem } });
    } else if (!createNewItem) {
        return setFocus(document, { type: "SetFocus", data: { item: undefined } });
    }

    const newItem = Item.newItemFromParent(focusedParent);
    const newDocument = Document.addItem(document, focusedParent, focusedParent.children.count(), newItem);

    return setFocus(newDocument, {
        type: "SetFocus", data: {
            item: newItem
        }
    });
}

function decrementFocus(document: Document.Document | null, action: DecrementFocus): Document.Document | null {
    if (!document)
        return null;

    const focusedItem = Document.getFocusedItem(document);
    if (!focusedItem)
        return setFocus(document, { type: "SetFocus", data: { item: Document.getLastItem(document, document.items.get(document.rootItemID), true) } });

    if (focusedItem.itemID == document.rootItemID)
        return setFocus(document, { type: "SetFocus", data: { item: undefined } });

    const prevItem = Document.getPrevItem(document, focusedItem, true);
    return setFocus(document, { type: "SetFocus", data: { item: prevItem } });
}

function indentItem(document: Document.Document | null, action: IndentItem): Document.Document | null {
    if (!document)
        return null;

    const item = action.data.item;
    const parent = document.items.get(item.parentID);
    if (!parent)
        return document;

    const indentation = Document.indentItem(document, item);
    let newDocument = { ...indentation.document, editedSinceSave: true };
    const indented = indentation.moved;

    const indentedParent = newDocument.items.get(indented.parentID);
    if (indentedParent && indentedParent.itemID == item.parentID)
        return indentItem(newDocument, { type: "IndentItem", data: { item: indentedParent } });
    return newDocument;
}

function unindentItem(document: Document.Document | null, action: UnindentItem): Document.Document | null {
    if (!document)
        return null;

    const item = action.data.item;
    if (!item)
        return document;

    const indentation = Document.unindentItem(document, item);
    let newDocument = indentation.document;
    const indented = indentation.moved;

    if (indented.parentID == item.parentID) {
        const nextItem = Document.getNextItem(document, indented);
        if (nextItem)
            return unindentItem(newDocument, { type: "UnindentItem", data: { item: nextItem } });
    }

    return {
        ...newDocument,
        editedSinceSave: true
    };
}

function makeHeader(document: Document.Document | null, action: MakeHeader): Document.Document | null {
    if (!document)
        return null;

    const item = action.data.item;

    if (item.itemID == document.rootItemID)
        return document;

    function getPreviousHeaderLevel(doc: Document.Document, curr: Item.Item | undefined): number {
        if (!curr || !curr.parentID || curr.itemID == doc.rootItemID)
            return 0;

        const hashes = curr.text.match(/(#+)\s+.*/);
        if (!hashes || hashes.length < 2)
            return getPreviousHeaderLevel(doc, doc.items.get(curr.parentID));

        return hashes[1].length;
    }

    const numHashes = getPreviousHeaderLevel(document, document.items.get(item.parentID)) + 1;
    const hashes = Range(0, numHashes).reduce((prev, i) => prev + '#', '');

    const newItem: Item.Item = {
        ...item,
        text: item.text.replace(/^(#+\s)?/, hashes + ' '),
        view: {
            ...item.view,
        }
    };

    return Document.updateItems({ ...document, editedSinceSave: true }, newItem);
}

function makeItem(document: Document.Document | null, action: MakeItem): Document.Document | null {
    if (!document)
        return null;

    const item = action.data.item;

    if (item.itemID == document.rootItemID)
        return document;

    const newItem: Item.Item = {
        ...item,
        text: item.text.replace(/^(#+\s)?/, ''),
        view: {
            ...item.view,
        }
    };

    return Document.updateItems({ ...document, editedSinceSave: true }, newItem);
}

function makeSelectionItem(document: Document.Document | null, action: MakeSelectionItem): Document.Document | null {
    if (!document)
        return null;

    return Document.getSelectionRange(document)
        .reduce((prev: Document.Document | null, selected) => makeItem(prev, { type: "MakeItem", data: { item: selected } }), { ...document, editedSinceSave: true });
}

function makeSelectionHeader(document: Document.Document | null, action: MakeSelectionHeader): Document.Document | null {
    if (!document)
        return null;

    return Document.getSelectionRange(document)
        .reduce((prev: Document.Document | null, selected) => makeHeader(prev, { type: "MakeHeader", data: { item: selected } }), { ...document, editedSinceSave: true });
}

function removeSelection(document: Document.Document | null, action: RemoveSelection): Document.Document | null {
    if (!document)
        return null;

    const selectionRange = Document.getSelectionRange(document);
    const newDocument = selectionRange.reduce((prev: Document.Document | null, selected) => {
        const item = !prev ? undefined : prev.items.get(selected.itemID);

        if (!prev)
            return null;
        else if (item)
            return removeItem(prev, { type: "RemoveItem", data: { item } });
        else
            return prev;
    }, document);

    return !newDocument ? null : {
        ...newDocument,
        selection: undefined
    }
}

function indentSelection(document: Document.Document | null, action: IndentSelection): Document.Document | null {
    if (!document)
        return null;

    const selectionRange = Document.getSelectionRange(document);
    const selectedItems = Document.getSelectedItems(document);

    let itemsToIndent = List<Item.Item>();

    for (let curr: Item.Item | undefined = selectionRange.get(0); curr != undefined && selectedItems.has(curr.itemID);) {
        itemsToIndent = itemsToIndent.push(curr);

        let next = Document.getNextSibling(document, curr);

        while (!next) {
            const nextParent = Document.getParent(document, curr);

            if (!nextParent) {
                curr = undefined;
                break;
            }

            curr = nextParent;
            next = Document.getNextSibling(document, curr);
        }

        curr = next;
    }

    return {
        ...itemsToIndent.reduce((prev, curr) => Document.indentItem(prev, prev.items.get(curr.itemID) || curr).document, document),
        editedSinceSave: true
    };
}

function unindentSelection(document: Document.Document | null, action: UnindentSelection): Document.Document | null {
    if (!document)
        return null;

    const selectionRange = Document.getSelectionRange(document);
    const selectedItems = Document.getSelectedItems(document);

    let itemsToUnindent = List<Item.Item>();

    for (let curr: Item.Item | undefined = selectionRange.get(0); curr != undefined && selectedItems.has(curr.itemID);) {
        itemsToUnindent = itemsToUnindent.push(curr);

        let next = Document.getNextSibling(document, curr);

        while (!next) {
            const nextParent = Document.getParent(document, curr);

            if (!nextParent) {
                curr = undefined;
                break;
            }

            curr = nextParent;
            next = Document.getNextSibling(document, curr);
        }

        curr = next;
    }

    return {
        ...itemsToUnindent.reduce((prev, curr) => Document.unindentItem(prev, prev.items.get(curr.itemID) || curr).document, document),
        editedSinceSave: true
    };
}

function addTableOfContents(document: Document.Document | null, action: AddTableOfContents): Document.Document | null {
    if (!document)
        return null;

    const rootItem = document.items.get(document.rootItemID);
    if (!rootItem)
        return document;

    const text = Document.getTableOfContentsText(document);
    const item = Item.newItemFromParent(rootItem);
    if (!item)
        return null;

    return {
        ...Document.addItem(document, rootItem, 0, {
            ...Item.changeStyle(item, { property: "lineHeight", value: 2, unit: "em" }),
            text
        }),
        tableOfContentsItemID: item.itemID,
        editedSinceSave: true
    };
}

function refreshTableOfContents(document: Document.Document | null, action: RefreshTableOfContents): Document.Document | null {
    if (!document)
        return null;

    const tocItem = !document.tableOfContentsItemID ?
        undefined :
        document.items.get(document.tableOfContentsItemID);

    if (!tocItem)
        return document;

    const text = Document.getTableOfContentsText(document);

    return {
        ...Document.updateItems(document, { ...tocItem, text }),
        editedSinceSave: true
    };
}

function multiSelect(document: Document.Document | null, action: MultiSelect): Document.Document | null {
    if (!document)
        return null;

    const item = action.data.item;
    if (item == undefined)
        return {
            ...document,
            selection: undefined
        }

    if (document.selection != undefined &&
        (document.selection.start == item.itemID || document.selection.end == item.itemID))
        return {
            ...document,
            selection: undefined
        };

    if (!document.selection)
        return {
            ...document,
            selection: {
                start: document.focusedItemID || item.itemID,
                end: item.itemID
            }
        };

    return {
        ...document,
        editedSinceSave: false,
        selection: {
            ...document.selection,
            end: item.itemID
        }
    };
}

function initializeDocument(document: Document.Document | null, action: InitializeDocument): Document.Document | null {
    if (action.data.document)
        return action.data.document;
    return Document.getEmptyDocument();
}

function updateItemIDs(document: Document.Document | null, action: UpdateItemIDs): Document.Document | null {
    if (!document)
        return document;

    return {
        ...Document.updateItemIDs(document, action.data.newIDs),
        editedSinceSave: false
    };
}

function updateItem(document: Document.Document | null, action: UpdateItem): Document.Document | null {
    if (!document)
        return document;

    const itemAction = action.data.action;

    const itemInDocument = document.items.get(action.data.item.itemID);
    if (!itemInDocument)
        return document;

    const updatedItem = ItemReducers.reducer(itemInDocument, itemAction);
    if (updatedItem === undefined)
        return document;

    return {
        ...Document.updateItems(document, updatedItem),
        editedSinceSave: updatedItem.text == action.data.item.text ? document.editedSinceSave : true
    };
}

function updateSelection(document: Document.Document | null, action: UpdateSelection): Document.Document | null {
    if (!document || !document.selection)
        return document;

    const selection = Document.getSelectionRange(document);
    const focused = !document.focusedItemID ? undefined : Document.getFocusedItem(document);

    const unfocusedDocument = !focused ? document : {
        ...Document.updateItems(document, { ...focused, view: { ...focused.view, cursorPosition: undefined } }),
        focusedItemID: undefined
    }

    return selection.reduce((prev: Document.Document | null, curr) => prev && updateItem(prev, {
        type: "UpdateItem",
        data: {
            item: curr,
            action: action.data.action
        }
    }), unfocusedDocument);
}

function paste(document: Document.Document | null, action: Paste): Document.Document | null {
    if (!document)
        return null;
    if (!action.data.clipboard || !action.data.clipboard.selection)
        return document;

    let newDocument = document;

    let clipboard = Document.regenerateIDs(action.data.clipboard);
    let inSelection = false;

    const selectedItems = Document.getSelectedItems(clipboard);
    const selection = clipboard.selection;

    const item = action.data.item;

    const addToParent = (item.children.count() > 0 && !item.view.collapsed) || item.itemID == document.rootItemID;
    const pasteBelow = !addToParent ? item : Item.newItemFromParent(item);
    if (!pasteBelow)
        return document;

    if (addToParent)
        newDocument = Document.addItem(newDocument, item, 0, pasteBelow);

    let prevDoc: Item.Item | undefined = pasteBelow;
    let prevSel: Item.Item | undefined = undefined;

    for (let curr: Item.Item | undefined = clipboard.items.get(clipboard.rootItemID); curr != undefined; curr = Document.getNextItem(clipboard, curr)) {
        if (!curr || !prevDoc || !selection)
            break;

        if (curr.itemID == selection.start || curr.itemID == selection.end)
            inSelection = !inSelection;
        if (!inSelection && curr.itemID != selection.start && curr.itemID != selection.end)
            continue;

        let newItem = curr;

        if (!prevSel || prevSel.itemID != curr.parentID) {
            const prevParent = newDocument.items.get(prevDoc.parentID);
            if (!prevParent)
                continue;

            const prevIndex = prevParent.children.indexOf(prevDoc.itemID);

            newItem = { ...curr, parentID: prevParent.itemID, children: List<Item.ItemID>() };
            newDocument = Document.addItem(newDocument, prevParent, prevIndex + 1, newItem);
        } else {
            newItem = { ...curr, parentID: prevDoc.itemID, children: List<Item.ItemID>() };
            newDocument = Document.addItem(newDocument, prevDoc, 0, newItem);
        }

        prevSel = curr;
        prevDoc = newItem;
    }

    if (addToParent)
        newDocument = Document.removeItem(document, pasteBelow);

    return {
        ...newDocument,
        editedSinceSave: true
    };
}

function markSaved(document: Document.Document | null, action: MarkSaved): Document.Document | null {
    return !document
        ? null
        : { ...document, editedSinceSave: false };
}

function markUnsaved(document: Document.Document | null, action: MarkUnsaved): Document.Document | null {
    return !document
        ? null
        : { ...document, editedSinceSave: true };
}

export function reducer(document: Document.Document | undefined | null, action: Action): Document.Document | null {
    const doc = document || null;

    switch (action.type) {
        case "AddItemToParent":
            return addItemToParent(doc, action);
        case "InitializeDocument":
            return initializeDocument(doc, action);
        case "AddItemAfterSibling":
            return addItemAfterSibling(doc, action);
        case "ToggleItemCollapse":
            return toggleItemCollapse(doc, action);
        case "RemoveItem":
            return removeItem(doc, action);
        case "SetFocus":
            return setFocus(doc, action);
        case "IncrementFocus":
            return incrementFocus(doc, action);
        case "DecrementFocus":
            return decrementFocus(doc, action);
        case "IndentItem":
            return indentItem(doc, action);
        case "UnindentItem":
            return unindentItem(doc, action);
        case "MakeHeader":
            return makeHeader(doc, action);
        case "MakeItem":
            return makeItem(doc, action);
        case "MultiSelect":
            return multiSelect(doc, action);
        case "MakeSelectionItem":
            return makeSelectionItem(doc, action);
        case "MakeSelectionHeader":
            return makeSelectionHeader(doc, action);
        case "RemoveSelection":
            return removeSelection(doc, action);
        case "IndentSelection":
            return indentSelection(doc, action);
        case "UnindentSelection":
            return unindentSelection(doc, action);
        case "AddTableOfContents":
            return addTableOfContents(doc, action);
        case "RefreshTableOfContents":
            return refreshTableOfContents(doc, action);
        case "UpdateItemIDs":
            return updateItemIDs(doc, action);
        case "UpdateItem":
            return updateItem(doc, action);
        case "UpdateSelection":
            return updateSelection(doc, action);
        case "Paste":
            return paste(doc, action);
        case "MarkSaved":
            return markSaved(doc, action);
        case "MarkUnsaved":
            return markUnsaved(doc, action);
        default:
            return doc;
    }
}