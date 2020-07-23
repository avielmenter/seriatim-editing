import { Map, List } from 'immutable';

import { Document } from './document';

import { Action, reducer as documentReducer } from './document/reducers';

export type EditEvent = {
    code: "EDIT_DOCUMENT",
    data: Action
}
export type Event
    = EditEvent;

export type ClientHandshake = {
    code: "CLIENT_HANDSHAKE",
    data: {
        sessionID: string,
        documentID: string,
        document: Document
    }
};

export type ClientEvent =
    ClientHandshake;

export type ServerError = {
    code: "SERVER_ERROR",
    data: any
};

export type ServerHandshake = {
    code: "SERVER_HANDSHAKE",
    data: Document
}

export type ServerEvent
    = ServerError
    | ServerHandshake;

export type EventType<E> = E extends { code: infer C, data: infer _D } ? C : never;
export type EventData<E> = E extends { code: infer _C, data: infer D } ? D : never;

export type Reducer = (document: Document, event: Event) => Document;

export const reducer: Reducer = (document: Document, event: Event): Document => {
    switch (event.code) {
        case "EDIT_DOCUMENT":
            return documentReducer(document, event.data) || document;
        default:
            return document;
    }
}