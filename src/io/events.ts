import { Map, List } from 'immutable';

import { Document, updateItemIDs, updateItems } from './document';
import { Item, ItemID } from './document/item';

import { Action, reducer as documentReducer } from './document/reducers';

export type UpdateDocumentEvent = {
    code: "UPDATE_DOCUMENT",
    data: Action
}

export type Event
    = UpdateDocumentEvent;

export type Reducer = (document: Document, event: Event) => Document;

export const reducer: Reducer = (document: Document, event: Event): Document => {
    switch (event.code) {
        case "UPDATE_DOCUMENT":
            return documentReducer(document, event.data) || document;
        default:
            return document;
    }
}