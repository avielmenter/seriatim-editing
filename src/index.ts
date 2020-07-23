import * as DotEnv from 'dotenv';
import * as SocketIO from 'socket.io';

import { closeDocument, connect, getSessionByID } from './redis';
import { OpenDocument } from './redis/openDocument';

import { Document } from './io/document';
import { ClientEvent, Event, reducer, ServerEvent, ClientHandshake, EditEvent, EventType, EventData } from './io/events';

import { parseClientHandshake, parseEditEvent } from './io/parse';

// TYPES

type ErrorCode
    = "DOCUMENT_UNOPENED"
    | "INSUFFICIENT_PERMISSIONS"
    | "INVALID_DATA"
    | "NOT_LOGGED_IN";

type Error = {
    code: ErrorCode,
    message: string
}

type EventHandler<T extends ClientEvent | Event> = (event: T) => Promise<void>;

// HELPER FUNCTIONS

const send_error = (socket: SocketIO.Socket, error: any) =>
    socket.emit("SERVER_ERROR", JSON.stringify({ code: "SERVER_ERROR", data: error }));


const send_event = (socket: SocketIO.Socket, event: Event | ServerEvent) =>
    socket.emit(event.code, JSON.stringify(event));

const err = (code: ErrorCode, message: string): Error => ({ code, message });

// SETUP

DotEnv.config();

const redis = connect(process.env.REDIS_URL as string);
const io = SocketIO();

let Documents: { [key: string]: Document | undefined } = {};
let OpenDocuments: { [key: string]: OpenDocument | undefined } = {};

io.on('connection', socket => {
    const wrap = <T>(onEvent: () => void) => () => {
        try {
            onEvent();
        } catch (e) {
            send_error(socket, e);
        }
    }

    function on<T extends ClientEvent | Event>(name: EventType<T>, onEvent: (input: T) => void, parseInput: (raw: any) => T | undefined): void {
        socket.on(name, (data: EventData<T>) => {
            try {
                const input = parseInput(data);
                if (!input)
                    throw err("INVALID_DATA", "You did not send data to the server in the correct format.");

                onEvent(input);
            } catch (e) {
                send_error(socket, e);
            }
        });
    }

    const onHandshake: EventHandler<ClientHandshake> = async (handshakeEvent: ClientHandshake) => {
        const handshake = handshakeEvent.data;

        const session = await getSessionByID(redis, handshake.sessionID);
        if (session === undefined)
            throw err("NOT_LOGGED_IN", "You are not logged in.");

        let od = session.openDocuments.get(handshake.documentID);
        if (od === undefined)
            throw err("DOCUMENT_UNOPENED", "Document was never opened.");

        OpenDocuments[socket.id] = od;

        let liveDocument = Documents[od.documentID] === undefined
            ? handshake.document
            : Documents[od.documentID] as Document;

        if (Documents[od.documentID] === undefined && od.permissions == "ReadWrite") {
            Documents[od.documentID] = handshake.document;
        }

        send_event(socket, { code: "SERVER_HANDSHAKE", data: liveDocument });
        socket.join(od.documentID);
    }

    const onEdit: EventHandler<EditEvent> = async (event: EditEvent) => {
        let od = OpenDocuments[socket.id];
        let doc = Documents[od?.documentID || ""];
        if (!od || !doc)
            throw err("DOCUMENT_UNOPENED", "You have not opened this documentt.");
        if (od.permissions != "ReadWrite")
            throw err("INSUFFICIENT_PERMISSIONS", "You do not have permission to edit this document.");

        send_event(socket.to(od.documentID), event);
        Documents[od.documentID] = reducer(doc, event);
    }

    const onDisconnect = async () => {
        let od = OpenDocuments[socket.id];
        let session = await getSessionByID(redis, od?.sessionID || "");

        if (!od || !session)
            return;

        OpenDocuments[socket.id] = undefined;
        await closeDocument(redis, session, od.documentID);
    }

    on("CLIENT_HANDSHAKE", onHandshake, parseClientHandshake);
    on("EDIT_DOCUMENT", onEdit, parseEditEvent);
    socket.on('disconnect', wrap(onDisconnect));
});

io.listen(process.env.PORT || 2999);