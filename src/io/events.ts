import { Map, List } from 'immutable';

import { Document, updateItemIDs, updateItems } from './document';
import { Item, ItemID } from './document/item';

export type UpdateItemEvent = {
    code: "UPDATE_ITEMS",
    data: List<Item>
}

export type UpdateIDsEvent = {
    code: "UPDATE_IDS",
    data: Map<ItemID, ItemID>
}

export type Event
    = UpdateIDsEvent
    | UpdateItemEvent;

export type Reducer = (document: Document, event: Event) => Document;

export const reducer: Reducer = (document: Document, event: Event): Document => {
    switch (event.code) {
        case "UPDATE_IDS":
            return updateItemIDs(document, event.data);
        case "UPDATE_ITEMS":
            return updateItems(document, ...event.data.toArray());
        default:
            return document;
    }
}