import http = require("http");
import type { Server as HTTPSServer } from "https";
import type { IncomingHttpHeaders, IncomingMessage } from "http";
import { createDeflate, createGzip, createBrotliCompress } from "zlib";
import accepts = require("accepts");
import { pipeline } from "stream";
import path = require("path");
import { attach, Server as Engine, uServer } from "engine.io";
import type {
    ServerOptions as EngineOptions,
    AttachOptions,
    BaseServer,
} from "engine.io";
import { EventEmitter } from "events";
import {
    Adapter,
    BroadcastFlags,
    SessionAwareAdapter,
    Room,
    SocketId,
    PrivateSessionId,
    Session,
} from "socket.io-adapter";
import * as parser from "socket.io-parser";
import type { Encoder } from "socket.io-parser";
import type { Socket as RawSocket } from "engine.io";
import { Decoder, Packet, PacketType } from "socket.io-parser";
import url = require("url");
import type { BroadcastOptions } from "socket.io-adapter";
import base64id from "base64id";
import { createReadStream, statSync } from "fs";
import type { WebSocket } from "uWebSockets.js";

const clientVersion = "0.0.0";
const dotMapRegex = /\.map/;

interface WriteOptions {
    compress?: boolean;
    volatile?: boolean;
    preEncoded?: boolean;
    wsPreEncoded?: string;
}
interface EventsMap {
    [event: string]: any;
}

interface Handshake {
    /**
     * The headers sent as part of the handshake
     */
    headers: IncomingHttpHeaders;

    /**
     * The date of creation (as string)
     */
    time: string;

    /**
     * The ip of the client
     */
    address: string;

    /**
     * Whether the connection is cross-domain
     */
    xdomain: boolean;

    /**
     * Whether the connection is secure
     */
    secure: boolean;

    /**
     * The date of creation (as unix timestamp)
     */
    issued: number;

    /**
     * The request URL string
     */
    url: string;

    /**
     * The auth object
     */
    auth: { [key: string]: any };
}

interface DefaultEventsMap {
    [event: string]: (...args: any[]) => void;
}

interface ExtendedError extends Error {
    data?: any;
}
interface NamespaceReservedEventsMap<
    ListenEvents extends EventsMap,
    EmitEvents extends EventsMap,
    ServerSideEvents extends EventsMap,
    SocketData
> {
    connect: (
        socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    ) => void;
    connection: (
        socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    ) => void;
}

interface TypedEventBroadcaster<EmitEvents extends EventsMap> {
    emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ): boolean;
}

interface ServerReservedEventsMap<
    ListenEvents extends EventsMap,
    EmitEvents extends EventsMap,
    ServerSideEvents extends EventsMap,
    SocketData
> extends NamespaceReservedEventsMap<
        ListenEvents,
        EmitEvents,
        ServerSideEvents,
        SocketData
    > {
    new_namespace: (
        namespace: Namespace<
            ListenEvents,
            EmitEvents,
            ServerSideEvents,
            SocketData
        >
    ) => void;
}

interface SocketDetails<SocketData> {
    id: SocketId;
    handshake: Handshake;
    rooms: Room[];
    data: SocketData;
}

interface SocketReservedEventsMap {
    disconnect: (reason: DisconnectReason, description?: any) => void;
    disconnecting: (reason: DisconnectReason, description?: any) => void;
    error: (err: Error) => void;
}

interface EventEmitterReservedEventsMap {
    newListener: (
        eventName: string | Symbol,
        listener: (...args: any[]) => void
    ) => void;
    removeListener: (
        eventName: string | Symbol,
        listener: (...args: any[]) => void
    ) => void;
}

function noop() {}

function subscribe(
    namespaceName: string,
    socket: Socket,
    isNew: boolean,
    rooms: Set<Room>
  ) {
    // @ts-ignore
    const sessionId = socket.conn.id;
    // @ts-ignore
    const websocket: WebSocket = socket.conn.transport.socket;
    if (isNew) {
      websocket.subscribe(namespaceName);
    }
    rooms.forEach((room) => {
      const topic = `${namespaceName}${SEPARATOR}${room}`; // '#' can be used as wildcard
      websocket.subscribe(topic);
    });
  }

function patchAdapter(app /* : TemplatedApp */) {
    Adapter.prototype.addAll = function (id, rooms) {
        const isNew = !this.sids.has(id);
        addAll.call(this, id, rooms);
        const socket: Socket = this.nsp.sockets.get(id);
        if (!socket) {
            return;
        }
        if (socket.conn.transport.name === "websocket") {
            subscribe(this.nsp.name, socket, isNew, rooms);
            return;
        }
        if (isNew) {
            socket.conn.on("upgrade", () => {
                const rooms = this.sids.get(id);
                if (rooms) {
                    subscribe(this.nsp.name, socket, isNew, rooms);
                }
            });
        }
    };

    Adapter.prototype.del = function (id, room) {
        del.call(this, id, room);
        const socket: Socket = this.nsp.sockets.get(id);
        if (socket && socket.conn.transport.name === "websocket") {
            // @ts-ignore
            const sessionId = socket.conn.id;
            // @ts-ignore
            const websocket: WebSocket = socket.conn.transport.socket;
            const topic = `${this.nsp.name}${SEPARATOR}${room}`;
            websocket.unsubscribe(topic);
        }
    };

    Adapter.prototype.broadcast = function (packet, opts) {
        const useFastPublish = opts.rooms.size <= 1 && opts.except!.size === 0;
        if (!useFastPublish) {
            broadcast.call(this, packet, opts);
            return;
        }

        const flags = opts.flags || {};
        const basePacketOpts = {
            preEncoded: true,
            volatile: flags.volatile,
            compress: flags.compress,
        };

        packet.nsp = this.nsp.name;
        const encodedPackets = this.encoder.encode(packet);

        const topic =
            opts.rooms.size === 0
                ? this.nsp.name
                : `${this.nsp.name}${SEPARATOR}${
                      opts.rooms.keys().next().value
                  }`;

        // fast publish for clients connected with WebSocket
        encodedPackets.forEach((encodedPacket) => {
            const isBinary = typeof encodedPacket !== "string";
            // "4" being the message type in the Engine.IO protocol, see https://github.com/socketio/engine.io-protocol
            app.publish(
                topic,
                isBinary ? encodedPacket : "4" + encodedPacket,
                isBinary
            );
        });

        this.apply(opts, (socket) => {
            if (socket.conn.transport.name !== "websocket") {
                // classic publish for clients connected with HTTP long-polling
                socket.client.writeToEngine(encodedPackets, basePacketOpts);
            }
        });
    };
}

function restoreAdapter() {
    Adapter.prototype.addAll = addAll;
    Adapter.prototype.del = del;
    Adapter.prototype.broadcast = broadcast;
}

function serveFile(res /* : HttpResponse */, filepath: string) {
    const { size } = statSync(filepath);
    const readStream = createReadStream(filepath);
    const destroyReadStream = () => !readStream.destroyed && readStream.destroy();

    const onError = (error: Error) => {
      destroyReadStream();
      throw error;
    };

    const onDataChunk = (chunk: Buffer) => {
      const arrayBufferChunk = toArrayBuffer(chunk);

      const lastOffset = res.getWriteOffset();
      const [ok, done] = res.tryEnd(arrayBufferChunk, size);

      if (!done && !ok) {
        readStream.pause();

        res.onWritable((offset) => {
          const [ok, done] = res.tryEnd(
            arrayBufferChunk.slice(offset - lastOffset),
            size
          );

          if (!done && ok) {
            readStream.resume();
          }

          return ok;
        });
      }
    };

    res.onAborted(destroyReadStream);
    readStream
      .on("data", onDataChunk)
      .on("error", onError)
      .on("end", destroyReadStream);
  }

type DisconnectReason =
    // Engine.IO close reasons
    | "transport error"
    | "transport close"
    | "forced close"
    | "ping timeout"
    | "parse error"
    // Socket.IO disconnect reasons
    | "server shutting down"
    | "forced server close"
    | "client namespace disconnect"
    | "server namespace disconnect";

const RECOVERABLE_DISCONNECT_REASONS: ReadonlySet<DisconnectReason> = new Set([
    "transport error",
    "transport close",
    "forced close",
    "ping timeout",
    "server shutting down",
    "forced server close",
]);

const toArrayBuffer = (buffer: Buffer) => {
    const { buffer: arrayBuffer, byteOffset, byteLength } = buffer;
    return arrayBuffer.slice(byteOffset, byteOffset + byteLength);
  };


const SEPARATOR = "\x1f"; // see https://en.wikipedia.org/wiki/Delimiter#ASCII_delimited_text

const { addAll, del, broadcast } = Adapter.prototype;

const RESERVED_EVENTS: ReadonlySet<string | Symbol> = new Set<
    | ClientReservedEvents
    | keyof NamespaceReservedEventsMap<never, never, never, never>
    | keyof SocketReservedEventsMap
    | keyof EventEmitterReservedEventsMap
>(<const>[
    "connect",
    "connect_error",
    "disconnect",
    "disconnecting",
    "newListener",
    "removeListener",
]);

type PrependTimeoutError<T extends any[]> = {
    [K in keyof T]: T[K] extends (...args: infer Params) => infer Result
        ? (err: Error, ...args: Params) => Result
        : T[K];
};

type DecorateAcknowledgements<E> = {
    [K in keyof E]: E[K] extends (...args: infer Params) => infer Result
        ? (...args: PrependTimeoutError<Params>) => Result
        : E[K];
};

type ClientReservedEvents = "connect_error";

type AllButLast<T extends any[]> = T extends [...infer H, infer L] ? H : any[];

type FirstArg<T> = T extends (arg: infer Param) => infer Result ? Param : any;

type FallbackToUntypedListener<T> = [T] extends [never]
    ? (...args: any[]) => void | Promise<void>
    : T;

type ReservedOrUserEventNames<
    ReservedEventsMap extends EventsMap,
    UserEvents extends EventsMap
> = EventNames<ReservedEventsMap> | EventNames<UserEvents>;

type ReservedOrUserListener<
    ReservedEvents extends EventsMap,
    UserEvents extends EventsMap,
    Ev extends ReservedOrUserEventNames<ReservedEvents, UserEvents>
> = FallbackToUntypedListener<
    Ev extends EventNames<ReservedEvents>
        ? ReservedEvents[Ev]
        : Ev extends EventNames<UserEvents>
        ? UserEvents[Ev]
        : never
>;

type SecondArg<T> = T extends (err: Error, arg: infer Param) => infer Result
    ? Param
    : any;

type ExpectMultipleResponses<T extends any[]> = {
    [K in keyof T]: T[K] extends (err: Error, arg: infer Param) => infer Result
        ? (err: Error, arg: Param[]) => Result
        : T[K];
};

type DecorateAcknowledgementsWithTimeoutAndMultipleResponses<E> = {
    [K in keyof E]: E[K] extends (...args: infer Params) => infer Result
        ? (
              ...args: ExpectMultipleResponses<PrependTimeoutError<Params>>
          ) => Result
        : E[K];
};

type EventNames<Map extends EventsMap> = keyof Map & (string | symbol);

type EventParams<
    Map extends EventsMap,
    Ev extends EventNames<Map>
> = Parameters<Map[Ev]>;

type CloseReason =
    | "transport error"
    | "transport close"
    | "forced close"
    | "ping timeout"
    | "parse error";

type ParentNspNameMatchFn = (
    name: string,
    auth: { [key: string]: any },
    fn: (err: Error | null, success: boolean) => void
) => void;

type Last<T extends any[]> = T extends [...infer H, infer L] ? L : any;

type DecorateAcknowledgementsWithMultipleResponses<E> = {
    [K in keyof E]: E[K] extends (...args: infer Params) => infer Result
        ? (...args: ExpectMultipleResponses<Params>) => Result
        : E[K];
};

type AdapterConstructor = typeof Adapter | ((nsp: Namespace) => Adapter);

interface ServerOptions extends EngineOptions, AttachOptions {
    /**
     * name of the path to capture
     * @default "/socket.io"
     */
    path: string;
    /**
     * whether to serve the client files
     * @default true
     */
    serveClient: boolean;
    /**
     * the adapter to use
     * @default the in-memory adapter (https://github.com/socketio/socket.io-adapter)
     */
    adapter: AdapterConstructor;
    /**
     * the parser to use
     * @default the default parser (https://github.com/socketio/socket.io-parser)
     */
    parser: any;
    /**
     * how many ms before a client without namespace is closed
     * @default 45000
     */
    connectTimeout: number;
    /**
     * Whether to enable the recovery of connection state when a client temporarily disconnects.
     *
     * The connection state includes the missed packets, the rooms the socket was in and the `data` attribute.
     */
    connectionStateRecovery: {
        /**
         * The backup duration of the sessions and the packets.
         *
         * @default 120000 (2 minutes)
         */
        maxDisconnectionDuration?: number;
        /**
         * Whether to skip middlewares upon successful connection state recovery.
         *
         * @default true
         */
        skipMiddlewares?: boolean;
    };
    /**
     * Whether to remove child namespaces that have no sockets connected to them
     * @default false
     */
    cleanupEmptyChildNamespaces: boolean;
}

/**
 * Represents a Socket.IO server.
 *
 * @example
 * import { Server } from "socket.io";
 *
 * const io = new Server();
 *
 * io.on("connection", (socket) => {
 *   console.log(`socket ${socket.id} connected`);
 *
 *   // send an event to the client
 *   socket.emit("foo", "bar");
 *
 *   socket.on("foobar", () => {
 *     // an event was received from the client
 *   });
 *
 *   // upon disconnection
 *   socket.on("disconnect", (reason) => {
 *     console.log(`socket ${socket.id} disconnected due to ${reason}`);
 *   });
 * });
 *
 * io.listen(3000);
 */

class StrictEventEmitter<
        ListenEvents extends EventsMap,
        EmitEvents extends EventsMap,
        ReservedEvents extends EventsMap = {}
    >
    extends EventEmitter
    implements TypedEventBroadcaster<EmitEvents>
{
    /**
     * Adds the `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    on<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev: Ev,
        listener: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this {
        return super.on(ev, listener);
    }

    /**
     * Adds a one-time `listener` function as an event listener for `ev`.
     *
     * @param ev Name of the event
     * @param listener Callback function
     */
    once<Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>>(
        ev: Ev,
        listener: ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>
    ): this {
        return super.once(ev, listener);
    }

    /**
     * Emits an event.
     *
     * @param ev Name of the event
     * @param args Values to send to listeners of this event
     */
    emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ): boolean {
        return super.emit(ev, ...args);
    }

    /**
     * Emits a reserved event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can emit its own reserved events.
     *
     * @param ev Reserved event name
     * @param args Arguments to emit along with the event
     */
    protected emitReserved<Ev extends EventNames<ReservedEvents>>(
        ev: Ev,
        ...args: EventParams<ReservedEvents, Ev>
    ): boolean {
        return super.emit(ev, ...args);
    }

    /**
     * Emits an event.
     *
     * This method is `protected`, so that only a class extending
     * `StrictEventEmitter` can get around the strict typing. This is useful for
     * calling `emit.apply`, which can be called as `emitUntyped.apply`.
     *
     * @param ev Event name
     * @param args Arguments to emit along with the event
     */
    protected emitUntyped(ev: string, ...args: any[]): boolean {
        return super.emit(ev, ...args);
    }

    /**
     * Returns the listeners listening to an event.
     *
     * @param event Event name
     * @returns Array of listeners subscribed to `event`
     */
    listeners<
        Ev extends ReservedOrUserEventNames<ReservedEvents, ListenEvents>
    >(event: Ev): ReservedOrUserListener<ReservedEvents, ListenEvents, Ev>[] {
        return super.listeners(event) as ReservedOrUserListener<
            ReservedEvents,
            ListenEvents,
            Ev
        >[];
    }
}

class Socket<
    ListenEvents extends EventsMap = DefaultEventsMap,
    EmitEvents extends EventsMap = ListenEvents,
    ServerSideEvents extends EventsMap = DefaultEventsMap,
    SocketData = any
> extends StrictEventEmitter<
    ListenEvents,
    EmitEvents,
    SocketReservedEventsMap
> {
    /**
     * An unique identifier for the session.
     */
    public readonly id: SocketId;
    /**
     * Whether the connection state was recovered after a temporary disconnection. In that case, any missed packets will
     * be transmitted to the client, the data attribute and the rooms will be restored.
     */
    public readonly recovered: boolean = false;
    /**
     * The handshake details.
     */
    public readonly handshake: Handshake;
    /**
     * Additional information that can be attached to the Socket instance and which will be used in the
     * {@link Server.fetchSockets()} method.
     */
    public data: SocketData = {} as SocketData;
    /**
     * Whether the socket is currently connected or not.
     *
     * @example
     * io.use((socket, next) => {
     *   console.log(socket.connected); // false
     *   next();
     * });
     *
     * io.on("connection", (socket) => {
     *   console.log(socket.connected); // true
     * });
     */
    public connected: boolean = false;

    /**
     * The session ID, which must not be shared (unlike {@link id}).
     *
     * @private
     */
    private readonly pid: PrivateSessionId;

    // TODO: remove this unused reference
    private readonly server: Server<
        ListenEvents,
        EmitEvents,
        ServerSideEvents,
        SocketData
    >;
    private readonly adapter: Adapter;
    private acks: Map<number, () => void> = new Map();
    private fns: Array<(event: Event, next: (err?: Error) => void) => void> =
        [];
    private flags: BroadcastFlags = {};
    private _anyListeners?: Array<(...args: any[]) => void>;
    private _anyOutgoingListeners?: Array<(...args: any[]) => void>;

    /**
     * Interface to a `Client` for a given `Namespace`.
     *
     * @param {Namespace} nsp
     * @param {Client} client
     * @param {Object} auth
     * @package
     */
    constructor(
        readonly nsp: Namespace<ListenEvents, EmitEvents, ServerSideEvents>,
        readonly client: Client<ListenEvents, EmitEvents, ServerSideEvents>,
        auth: Record<string, unknown>,
        previousSession?: Session
    ) {
        super();
        this.server = nsp.server;
        this.adapter = this.nsp.adapter;
        if (previousSession) {
            this.id = previousSession.sid;
            this.pid = previousSession.pid;
            previousSession.rooms.forEach((room) => this.join(room));
            this.data = previousSession.data as SocketData;
            previousSession.missedPackets.forEach((packet) => {
                this.packet({
                    type: PacketType.EVENT,
                    data: packet,
                });
            });
            this.recovered = true;
        } else {
            if (client.conn.protocol === 3) {
                // @ts-ignore
                this.id =
                    nsp.name !== "/" ? nsp.name + "#" + client.id : client.id;
            } else {
                this.id = base64id.generateId(); // don't reuse the Engine.IO id because it's sensitive information
            }
            if (this.server._opts.connectionStateRecovery) {
                this.pid = base64id.generateId();
            }
        }
        this.handshake = this.buildHandshake(auth);

        // prevents crash when the socket receives an "error" event without listener
        this.on("error", noop);
    }

    /**
     * Builds the `handshake` BC object
     *
     * @private
     */
    private buildHandshake(auth: object): Handshake {
        return {
            headers: this.request?.headers || {},
            time: new Date() + "",
            address: this.conn.remoteAddress,
            xdomain: !!this.request?.headers.origin,
            // @ts-ignore
            secure: !this.request || !!this.request.connection.encrypted,
            issued: +new Date(),
            url: this.request?.url!,
            // @ts-ignore
            query: this.request?._query || {},
            auth,
        };
    }

    /**
     * Emits to this client.
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.emit("hello", "world");
     *
     *   // all serializable datastructures are supported (no need to call JSON.stringify)
     *   socket.emit("hello", 1, "2", { 3: ["4"], 5: Buffer.from([6]) });
     *
     *   // with an acknowledgement from the client
     *   socket.emit("hello", "world", (val) => {
     *     // ...
     *   });
     * });
     *
     * @return Always returns `true`.
     */
    public emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ): boolean {
        if (RESERVED_EVENTS.has(ev)) {
            throw new Error(`"${String(ev)}" is a reserved event name`);
        }
        const data: any[] = [ev, ...args];
        const packet: any = {
            type: PacketType.EVENT,
            data: data,
        };

        // access last argument to see if it's an ACK callback
        if (typeof data[data.length - 1] === "function") {
            const id = this.nsp._ids++;

            this.registerAckCallback(id, data.pop());
            packet.id = id;
        }

        const flags = Object.assign({}, this.flags);
        this.flags = {};

        // @ts-ignore
        if (this.nsp.server.opts.connectionStateRecovery) {
            // this ensures the packet is stored and can be transmitted upon reconnection
            this.adapter.broadcast(packet, {
                rooms: new Set([this.id]),
                except: new Set(),
                flags,
            });
        } else {
            this.notifyOutgoingListeners(packet);
            this.packet(packet, flags);
        }

        return true;
    }

    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * io.on("connection", async (socket) => {
     *   // without timeout
     *   const response = await socket.emitWithAck("hello", "world");
     *
     *   // with a specific timeout
     *   try {
     *     const response = await socket.timeout(1000).emitWithAck("hello", "world");
     *   } catch (err) {
     *     // the client did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @return a Promise that will be fulfilled when the client acknowledges the event
     */
    public emitWithAck<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: AllButLast<EventParams<EmitEvents, Ev>>
    ): Promise<FirstArg<Last<EventParams<EmitEvents, Ev>>>> {
        // the timeout flag is optional
        const withErr = this.flags.timeout !== undefined;
        return new Promise((resolve, reject) => {
            args.push((arg1, arg2) => {
                if (withErr) {
                    return arg1 ? reject(arg1) : resolve(arg2);
                } else {
                    return resolve(arg1);
                }
            });
            this.emit(ev, ...(args as any[] as EventParams<EmitEvents, Ev>));
        });
    }

    /**
     * @private
     */
    private registerAckCallback(
        id: number,
        ack: (...args: any[]) => void
    ): void {
        const timeout = this.flags.timeout;
        if (timeout === undefined) {
            this.acks.set(id, ack);
            return;
        }

        const timer = setTimeout(() => {
            this.acks.delete(id);
            ack.call(this, new Error("operation has timed out"));
        }, timeout);

        this.acks.set(id, (...args) => {
            clearTimeout(timer);
            ack.apply(this, [null, ...args]);
        });
    }

    /**
     * Targets a room when broadcasting.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // the “foo” event will be broadcast to all connected clients in the “room-101” room, except this socket
     *   socket.to("room-101").emit("foo", "bar");
     *
     *   // the code above is equivalent to:
     *   io.to("room-101").except(socket.id).emit("foo", "bar");
     *
     *   // with an array of rooms (a client will be notified at most once)
     *   socket.to(["room-101", "room-102"]).emit("foo", "bar");
     *
     *   // with multiple chained calls
     *   socket.to("room-101").to("room-102").emit("foo", "bar");
     * });
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public to(room: Room | Room[]) {
        return this.newBroadcastOperator().to(room);
    }

    /**
     * Targets a room when broadcasting. Similar to `to()`, but might feel clearer in some cases:
     *
     * @example
     * io.on("connection", (socket) => {
     *   // disconnect all clients in the "room-101" room, except this socket
     *   socket.in("room-101").disconnectSockets();
     * });
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public in(room: Room | Room[]) {
        return this.newBroadcastOperator().in(room);
    }

    /**
     * Excludes a room when broadcasting.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
     *   // and this socket
     *   socket.except("room-101").emit("foo", "bar");
     *
     *   // with an array of rooms
     *   socket.except(["room-101", "room-102"]).emit("foo", "bar");
     *
     *   // with multiple chained calls
     *   socket.except("room-101").except("room-102").emit("foo", "bar");
     * });
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public except(room: Room | Room[]) {
        return this.newBroadcastOperator().except(room);
    }

    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.send("hello");
     *
     *   // this is equivalent to
     *   socket.emit("message", "hello");
     * });
     *
     * @return self
     */
    public send(...args: EventParams<EmitEvents, "message">): this {
        this.emit("message", ...args);
        return this;
    }

    /**
     * Sends a `message` event. Alias of {@link send}.
     *
     * @return self
     */
    public write(...args: EventParams<EmitEvents, "message">): this {
        this.emit("message", ...args);
        return this;
    }

    /**
     * Writes a packet.
     *
     * @param {Object} packet - packet object
     * @param {Object} opts - options
     * @private
     */
    private packet(
        packet: Omit<Packet, "nsp"> & Partial<Pick<Packet, "nsp">>,
        opts: any = {}
    ): void {
        packet.nsp = this.nsp.name;
        opts.compress = false !== opts.compress;
        this.client._packet(packet as Packet, opts);
    }

    /**
     * Joins a room.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // join a single room
     *   socket.join("room1");
     *
     *   // join multiple rooms
     *   socket.join(["room1", "room2"]);
     * });
     *
     * @param {String|Array} rooms - room or array of rooms
     * @return a Promise or nothing, depending on the adapter
     */
    public join(rooms: Room | Array<Room>): Promise<void> | void {
        return this.adapter.addAll(
            this.id,
            new Set(Array.isArray(rooms) ? rooms : [rooms])
        );
    }

    /**
     * Leaves a room.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // leave a single room
     *   socket.leave("room1");
     *
     *   // leave multiple rooms
     *   socket.leave("room1").leave("room2");
     * });
     *
     * @param {String} room
     * @return a Promise or nothing, depending on the adapter
     */
    public leave(room: string): Promise<void> | void {
        return this.adapter.del(this.id, room);
    }

    /**
     * Leave all rooms.
     *
     * @private
     */
    private leaveAll(): void {
        this.adapter.delAll(this.id);
    }

    /**
     * Called by `Namespace` upon successful
     * middleware execution (ie: authorization).
     * Socket is added to namespace array before
     * call to join, so adapters can access it.
     *
     * @private
     */
    _onconnect(): void {
        this.connected = true;
        this.join(this.id);
        if (this.conn.protocol === 3) {
            this.packet({ type: PacketType.CONNECT });
        } else {
            this.packet({
                type: PacketType.CONNECT,
                data: { sid: this.id, pid: this.pid },
            });
        }
    }

    /**
     * Called with each packet. Called by `Client`.
     *
     * @param {Object} packet
     * @private
     */
    _onpacket(packet: Packet): void {
        switch (packet.type) {
            case PacketType.EVENT:
                this.onevent(packet);
                break;

            case PacketType.BINARY_EVENT:
                this.onevent(packet);
                break;

            case PacketType.ACK:
                this.onack(packet);
                break;

            case PacketType.BINARY_ACK:
                this.onack(packet);
                break;

            case PacketType.DISCONNECT:
                this.ondisconnect();
                break;
        }
    }

    /**
     * Called upon event packet.
     *
     * @param {Packet} packet - packet object
     * @private
     */
    private onevent(packet: Packet): void {
        const args = packet.data || [];

        if (null != packet.id) {
            args.push(this.ack(packet.id));
        }

        if (this._anyListeners && this._anyListeners.length) {
            const listeners = this._anyListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, args);
            }
        }
        this.dispatch(args);
    }

    /**
     * Produces an ack callback to emit with an event.
     *
     * @param {Number} id - packet id
     * @private
     */
    private ack(id: number): () => void {
        const self = this;
        let sent = false;
        return function () {
            // prevent double callbacks
            if (sent) return;
            const args = Array.prototype.slice.call(arguments);

            self.packet({
                id: id,
                type: PacketType.ACK,
                data: args,
            });

            sent = true;
        };
    }

    /**
     * Called upon ack packet.
     *
     * @private
     */
    private onack(packet: Packet): void {
        const ack = this.acks.get(packet.id!);
        if ("function" == typeof ack) {
            ack.apply(this, packet.data);
            this.acks.delete(packet.id!);
        } else {
        }
    }

    /**
     * Called upon client disconnect packet.
     *
     * @private
     */
    private ondisconnect(): void {
        this._onclose("client namespace disconnect");
    }

    /**
     * Handles a client error.
     *
     * @private
     */
    _onerror(err: Error): void {
        // FIXME the meaning of the "error" event is overloaded:
        //  - it can be sent by the client (`socket.emit("error")`)
        //  - it can be emitted when the connection encounters an error (an invalid packet for example)
        //  - it can be emitted when a packet is rejected in a middleware (`socket.use()`)
        this.emitReserved("error", err);
    }

    /**
     * Called upon closing. Called by `Client`.
     *
     * @param {String} reason
     * @param description
     * @throw {Error} optional error object
     *
     * @private
     */
    _onclose(reason: DisconnectReason, description?: any): this | undefined {
        if (!this.connected) return this;
        this.emitReserved("disconnecting", reason, description);

        if (
            this.server._opts.connectionStateRecovery &&
            RECOVERABLE_DISCONNECT_REASONS.has(reason)
        ) {
            this.adapter.persistSession({
                sid: this.id,
                pid: this.pid,
                rooms: [...this.rooms],
                data: this.data,
            });
        }

        this._cleanup();
        this.client._remove(this);
        this.connected = false;
        this.emitReserved("disconnect", reason, description);
        return;
    }

    /**
     * Makes the socket leave all the rooms it was part of and prevents it from joining any other room
     *
     * @private
     */
    _cleanup() {
        this.leaveAll();
        this.nsp._remove(this);
        this.join = noop;
    }

    /**
     * Produces an `error` packet.
     *
     * @param {Object} err - error object
     *
     * @private
     */
    _error(err): void {
        this.packet({ type: PacketType.CONNECT_ERROR, data: err });
    }

    /**
     * Disconnects this client.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // disconnect this socket (the connection might be kept alive for other namespaces)
     *   socket.disconnect();
     *
     *   // disconnect this socket and close the underlying connection
     *   socket.disconnect(true);
     * })
     *
     * @param {Boolean} close - if `true`, closes the underlying connection
     * @return self
     */
    public disconnect(close = false): this {
        if (!this.connected) return this;
        if (close) {
            this.client._disconnect();
        } else {
            this.packet({ type: PacketType.DISCONNECT });
            this._onclose("server namespace disconnect");
        }
        return this;
    }

    /**
     * Sets the compress flag.
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.compress(false).emit("hello");
     * });
     *
     * @param {Boolean} compress - if `true`, compresses the sending data
     * @return {Socket} self
     */
    public compress(compress: boolean): this {
        this.flags.compress = compress;
        return this;
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
     * receive messages (because of network slowness or other issues, or because they’re connected through long polling
     * and is in the middle of a request-response cycle).
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.volatile.emit("hello"); // the client may or may not receive it
     * });
     *
     * @return {Socket} self
     */
    public get volatile(): this {
        this.flags.volatile = true;
        return this;
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to every sockets but the
     * sender.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // the “foo” event will be broadcast to all connected clients, except this socket
     *   socket.broadcast.emit("foo", "bar");
     * });
     *
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public get broadcast() {
        return this.newBroadcastOperator();
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
     *
     * @example
     * io.on("connection", (socket) => {
     *   // the “foo” event will be broadcast to all connected clients on this node, except this socket
     *   socket.local.emit("foo", "bar");
     * });
     *
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public get local() {
        return this.newBroadcastOperator().local;
    }

    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the client:
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.timeout(5000).emit("my-event", (err) => {
     *     if (err) {
     *       // the client did not acknowledge the event in the given delay
     *     }
     *   });
     * });
     *
     * @returns self
     */
    public timeout(
        timeout: number
    ): Socket<
        ListenEvents,
        DecorateAcknowledgements<EmitEvents>,
        ServerSideEvents,
        SocketData
    > {
        this.flags.timeout = timeout;
        return this;
    }

    /**
     * Dispatch incoming event to socket listeners.
     *
     * @param {Array} event - event that will get emitted
     * @private
     */
    private dispatch(event: Event): void {
        this.run(event, (err) => {
            process.nextTick(() => {
                if (err) {
                    return this._onerror(err);
                }
                if (this.connected) {
                    super.emitUntyped.apply(this, event);
                } else {
                }
            });
        });
    }

    /**
     * Sets up socket middleware.
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.use(([event, ...args], next) => {
     *     if (isUnauthorized(event)) {
     *       return next(new Error("unauthorized event"));
     *     }
     *     // do not forget to call next
     *     next();
     *   });
     *
     *   socket.on("error", (err) => {
     *     if (err && err.message === "unauthorized event") {
     *       socket.disconnect();
     *     }
     *   });
     * });
     *
     * @param {Function} fn - middleware function (event, next)
     * @return {Socket} self
     */
    public use(fn: (event: Event, next: (err?: Error) => void) => void): this {
        this.fns.push(fn);
        return this;
    }

    /**
     * Executes the middleware for an incoming event.
     *
     * @param {Array} event - event that will get emitted
     * @param {Function} fn - last fn call in the middleware
     * @private
     */
    private run(event: Event, fn: (err: Error | null) => void): void {
        const fns = this.fns.slice(0);
        if (!fns.length) return fn(null);

        function run(i: number) {
            fns[i](event, function (err) {
                // upon error, short-circuit
                if (err) return fn(err);

                // if no middleware left, summon callback
                if (!fns[i + 1]) return fn(null);

                // go on to next
                run(i + 1);
            });
        }

        run(0);
    }

    /**
     * Whether the socket is currently disconnected
     */
    public get disconnected() {
        return !this.connected;
    }

    /**
     * A reference to the request that originated the underlying Engine.IO Socket.
     */
    public get request(): IncomingMessage {
        return this.client.request;
    }

    /**
     * A reference to the underlying Client transport connection (Engine.IO Socket object).
     *
     * @example
     * io.on("connection", (socket) => {
     *   console.log(socket.conn.transport.name); // prints "polling" or "websocket"
     *
     *   socket.conn.once("upgrade", () => {
     *     console.log(socket.conn.transport.name); // prints "websocket"
     *   });
     * });
     */
    public get conn() {
        return this.client.conn;
    }

    /**
     * Returns the rooms the socket is currently in.
     *
     * @example
     * io.on("connection", (socket) => {
     *   console.log(socket.rooms); // Set { <socket.id> }
     *
     *   socket.join("room1");
     *
     *   console.log(socket.rooms); // Set { <socket.id>, "room1" }
     * });
     */
    public get rooms(): Set<Room> {
        return this.adapter.socketRooms(this.id) || new Set();
    }

    /**
     * Adds a listener that will be fired when any event is received. The event name is passed as the first argument to
     * the callback.
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.onAny((event, ...args) => {
     *     console.log(`got event ${event}`);
     *   });
     * });
     *
     * @param listener
     */
    public onAny(listener: (...args: any[]) => void): this {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.push(listener);
        return this;
    }

    /**
     * Adds a listener that will be fired when any event is received. The event name is passed as the first argument to
     * the callback. The listener is added to the beginning of the listeners array.
     *
     * @param listener
     */
    public prependAny(listener: (...args: any[]) => void): this {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.unshift(listener);
        return this;
    }

    /**
     * Removes the listener that will be fired when any event is received.
     *
     * @example
     * io.on("connection", (socket) => {
     *   const catchAllListener = (event, ...args) => {
     *     console.log(`got event ${event}`);
     *   }
     *
     *   socket.onAny(catchAllListener);
     *
     *   // remove a specific listener
     *   socket.offAny(catchAllListener);
     *
     *   // or remove all listeners
     *   socket.offAny();
     * });
     *
     * @param listener
     */
    public offAny(listener?: (...args: any[]) => void): this {
        if (!this._anyListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        } else {
            this._anyListeners = [];
        }
        return this;
    }

    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    public listenersAny() {
        return this._anyListeners || [];
    }

    /**
     * Adds a listener that will be fired when any event is sent. The event name is passed as the first argument to
     * the callback.
     *
     * Note: acknowledgements sent to the client are not included.
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.onAnyOutgoing((event, ...args) => {
     *     console.log(`sent event ${event}`);
     *   });
     * });
     *
     * @param listener
     */
    public onAnyOutgoing(listener: (...args: any[]) => void): this {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.push(listener);
        return this;
    }

    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * io.on("connection", (socket) => {
     *   socket.prependAnyOutgoing((event, ...args) => {
     *     console.log(`sent event ${event}`);
     *   });
     * });
     *
     * @param listener
     */
    public prependAnyOutgoing(listener: (...args: any[]) => void): this {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.unshift(listener);
        return this;
    }

    /**
     * Removes the listener that will be fired when any event is sent.
     *
     * @example
     * io.on("connection", (socket) => {
     *   const catchAllListener = (event, ...args) => {
     *     console.log(`sent event ${event}`);
     *   }
     *
     *   socket.onAnyOutgoing(catchAllListener);
     *
     *   // remove a specific listener
     *   socket.offAnyOutgoing(catchAllListener);
     *
     *   // or remove all listeners
     *   socket.offAnyOutgoing();
     * });
     *
     * @param listener - the catch-all listener
     */
    public offAnyOutgoing(listener?: (...args: any[]) => void): this {
        if (!this._anyOutgoingListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyOutgoingListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        } else {
            this._anyOutgoingListeners = [];
        }
        return this;
    }

    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    public listenersAnyOutgoing() {
        return this._anyOutgoingListeners || [];
    }

    /**
     * Notify the listeners for each packet sent (emit or broadcast)
     *
     * @param packet
     *
     * @private
     */
    private notifyOutgoingListeners(packet: Packet) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
            const listeners = this._anyOutgoingListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, packet.data);
            }
        }
    }

    private newBroadcastOperator() {
        const flags = Object.assign({}, this.flags);
        this.flags = {};
        return new BroadcastOperator<
            DecorateAcknowledgementsWithMultipleResponses<EmitEvents>,
            SocketData
        >(this.adapter, new Set<Room>(), new Set<Room>([this.id]), flags);
    }
}

class Client<
    ListenEvents extends EventsMap,
    EmitEvents extends EventsMap,
    ServerSideEvents extends EventsMap,
    SocketData = any
> {
    public readonly conn: RawSocket;

    public readonly id: string;
    private readonly server: Server<
        ListenEvents,
        EmitEvents,
        ServerSideEvents,
        SocketData
    >;
    private readonly encoder: Encoder;
    private readonly decoder: Decoder;
    private sockets: Map<
        SocketId,
        Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    > = new Map();
    private nsps: Map<
        string,
        Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    > = new Map();
    private connectTimeout?: NodeJS.Timeout;

    /**
     * Client constructor.
     *
     * @param server instance
     * @param conn
     * @package
     */
    constructor(
        server: Server<ListenEvents, EmitEvents, ServerSideEvents, SocketData>,
        conn: any
    ) {
        this.server = server;
        this.conn = conn;
        this.encoder = server.encoder;
        this.decoder = new server._parser.Decoder();
        this.id = conn.id;
        this.setup();
    }

    /**
     * @return the reference to the request that originated the Engine.IO connection
     *
     * @public
     */
    public get request(): IncomingMessage {
        return this.conn.request;
    }

    /**
     * Sets up event listeners.
     *
     * @private
     */
    private setup() {
        this.onclose = this.onclose.bind(this);
        this.ondata = this.ondata.bind(this);
        this.onerror = this.onerror.bind(this);
        this.ondecoded = this.ondecoded.bind(this);

        // @ts-ignore
        this.decoder.on("decoded", this.ondecoded);
        this.conn.on("data", this.ondata);
        this.conn.on("error", this.onerror);
        this.conn.on("close", this.onclose);

        this.connectTimeout = setTimeout(() => {
            if (this.nsps.size === 0) {
                this.close();
            } else {
            }
        }, this.server._connectTimeout);
    }

    /**
     * Connects a client to a namespace.
     *
     * @param {String} name - the namespace
     * @param {Object} auth - the auth parameters
     * @private
     */
    private connect(name: string, auth: Record<string, unknown> = {}): void {
        if (this.server._nsps.has(name)) {
            return this.doConnect(name, auth);
        }

        this.server._checkNamespace(
            name,
            auth,
            (
                dynamicNspName:
                    | Namespace<
                          ListenEvents,
                          EmitEvents,
                          ServerSideEvents,
                          SocketData
                      >
                    | false
            ) => {
                if (dynamicNspName) {
                    this.doConnect(name, auth);
                } else {
                    this._packet({
                        type: PacketType.CONNECT_ERROR,
                        nsp: name,
                        data: {
                            message: "Invalid namespace",
                        },
                    });
                }
            }
        );
    }

    /**
     * Connects a client to a namespace.
     *
     * @param name - the namespace
     * @param {Object} auth - the auth parameters
     *
     * @private
     */
    private doConnect(name: string, auth: Record<string, unknown>): void {
        const nsp = this.server.of(name);
        // Use a specific type for SocketData if applicable

        nsp._add(this as any, auth, (socket) => {
            this.sockets.set(socket.id, socket);
            this.nsps.set(nsp.name, socket);

            if (this.connectTimeout) {
                clearTimeout(this.connectTimeout);
                this.connectTimeout = undefined;
            }
        });
    }

    /**
     * Disconnects from all namespaces and closes transport.
     *
     * @private
     */
    _disconnect(): void {
        for (const socket of this.sockets.values()) {
            socket.disconnect();
        }
        this.sockets.clear();
        this.close();
    }

    /**
     * Removes a socket. Called by each `Socket`.
     *
     * @private
     */
    _remove(
        socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    ): void {
        if (this.sockets.has(socket.id)) {
            const nsp = this.sockets.get(socket.id)!.nsp.name;
            this.sockets.delete(socket.id);
            this.nsps.delete(nsp);
        } else {
        }
    }

    /**
     * Closes the underlying connection.
     *
     * @private
     */
    private close(): void {
        if ("open" === this.conn.readyState) {
            this.conn.close();
            this.onclose("forced server close");
        }
    }

    /**
     * Writes a packet to the transport.
     *
     * @param {Object} packet object
     * @param {Object} opts
     * @private
     */
    _packet(packet: Packet | any[], opts: WriteOptions = {}): void {
        if (this.conn.readyState !== "open") {
            return;
        }
        const encodedPackets = opts.preEncoded
            ? (packet as any[]) // previous versions of the adapter incorrectly used socket.packet() instead of writeToEngine()
            : this.encoder.encode(packet as Packet);
        this.writeToEngine(encodedPackets, opts);
    }

    private writeToEngine(
        encodedPackets: Array<string | Buffer>,
        opts: WriteOptions
    ): void {
        if (opts.volatile && !this.conn.transport.writable) {
            return;
        }
        const packets = Array.isArray(encodedPackets)
            ? encodedPackets
            : [encodedPackets];
        for (const encodedPacket of packets) {
            this.conn.write(encodedPacket, opts);
        }
    }

    /**
     * Called with incoming transport data.
     *
     * @private
     */
    private ondata(data): void {
        // try/catch is needed for protocol violations (GH-1880)
        try {
            this.decoder.add(data);
        } catch (e) {
            this.onerror(e);
        }
    }

    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    private ondecoded(packet: Packet): void {
        let namespace: string;
        let authPayload: Record<string, unknown>;
        if (this.conn.protocol === 3) {
            const parsed = url.parse(packet.nsp, true);
            namespace = parsed.pathname!;
            authPayload = parsed.query;
        } else {
            namespace = packet.nsp;
            authPayload = packet.data;
        }
        const socket = this.nsps.get(namespace);

        if (!socket && packet.type === PacketType.CONNECT) {
            this.connect(namespace, authPayload);
        } else if (
            socket &&
            packet.type !== PacketType.CONNECT &&
            packet.type !== PacketType.CONNECT_ERROR
        ) {
            process.nextTick(function () {
                socket._onpacket(packet);
            });
        } else {
            this.close();
        }
    }

    /**
     * Handles an error.
     *
     * @param {Object} err object
     * @private
     */
    private onerror(err): void {
        for (const socket of this.sockets.values()) {
            socket._onerror(err);
        }
        this.conn.close();
    }

    /**
     * Called upon transport close.
     *
     * @param reason
     * @param description
     * @private
     */
    private onclose(
        reason: CloseReason | "forced server close",
        description?: any
    ): void {
        // ignore a potential subsequent `close` event
        this.destroy();

        // `nsps` and `sockets` are cleaned up seamlessly
        for (const socket of this.sockets.values()) {
            socket._onclose(reason, description);
        }
        this.sockets.clear();

        this.decoder.destroy(); // clean up decoder
    }

    /**
     * Cleans up event listeners.
     * @private
     */
    private destroy(): void {
        this.conn.removeListener("data", this.ondata);
        this.conn.removeListener("error", this.onerror);
        this.conn.removeListener("close", this.onclose);
        // @ts-ignore
        this.decoder.removeListener("decoded", this.ondecoded);

        if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
            this.connectTimeout = undefined;
        }
    }
}

class Namespace<
    ListenEvents extends EventsMap = DefaultEventsMap,
    EmitEvents extends EventsMap = ListenEvents,
    ServerSideEvents extends EventsMap = DefaultEventsMap,
    SocketData = any
> extends StrictEventEmitter<
    ServerSideEvents,
    EmitEvents,
    NamespaceReservedEventsMap<
        ListenEvents,
        EmitEvents,
        ServerSideEvents,
        SocketData
    >
> {
    public readonly name: string;
    public readonly sockets: Map<
        SocketId,
        Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    > = new Map();

    public adapter: Adapter;

    /** @private */
    readonly server: Server<
        ListenEvents,
        EmitEvents,
        ServerSideEvents,
        SocketData
    >;

    /** @private */
    _fns: Array<
        (
            socket: Socket<
                ListenEvents,
                EmitEvents,
                ServerSideEvents,
                SocketData
            >,
            next: (err?: ExtendedError) => void
        ) => void
    > = [];

    /** @private */
    _ids: number = 0;

    /**
     * Namespace constructor.
     *
     * @param server instance
     * @param name
     */
    constructor(
        server: Server<ListenEvents, EmitEvents, ServerSideEvents, SocketData>,
        name: string
    ) {
        super();
        this.server = server;
        this.name = name;
        this._initAdapter();
    }

    /**
     * Initializes the `Adapter` for this nsp.
     * Run upon changing adapter by `Server#adapter`
     * in addition to the constructor.
     *
     * @private
     */
    _initAdapter(): void {
        // @ts-ignore
        this.adapter = new (this.server.adapter()!)(this);
    }

    /**
     * Registers a middleware, which is a function that gets executed for every incoming {@link Socket}.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * myNamespace.use((socket, next) => {
     *   // ...
     *   next();
     * });
     *
     * @param fn - the middleware function
     */
    public use(
        fn: (
            socket: Socket<
                ListenEvents,
                EmitEvents,
                ServerSideEvents,
                SocketData
            >,
            next: (err?: ExtendedError) => void
        ) => void
    ): this {
        this._fns.push(fn);
        return this;
    }

    /**
     * Executes the middleware for an incoming client.
     *
     * @param socket - the socket that will get added
     * @param fn - last fn call in the middleware
     * @private
     */
    private run(
        socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>,
        fn: (err: ExtendedError | null) => void
    ) {
        const fns = this._fns.slice(0);
        if (!fns.length) return fn(null);

        function run(i: number) {
            fns[i](socket, function (err) {
                // upon error, short-circuit
                if (err) return fn(err);

                // if no middleware left, summon callback
                if (!fns[i + 1]) return fn(null);

                // go on to next
                run(i + 1);
            });
        }

        run(0);
    }

    /**
     * Targets a room when emitting.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // the “foo” event will be broadcast to all connected clients in the “room-101” room
     * myNamespace.to("room-101").emit("foo", "bar");
     *
     * // with an array of rooms (a client will be notified at most once)
     * myNamespace.to(["room-101", "room-102"]).emit("foo", "bar");
     *
     * // with multiple chained calls
     * myNamespace.to("room-101").to("room-102").emit("foo", "bar");
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public to(room: Room | Room[]) {
        return new BroadcastOperator<EmitEvents, SocketData>(this.adapter).to(
            room
        );
    }

    /**
     * Targets a room when emitting. Similar to `to()`, but might feel clearer in some cases:
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // disconnect all clients in the "room-101" room
     * myNamespace.in("room-101").disconnectSockets();
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public in(room: Room | Room[]) {
        return new BroadcastOperator<EmitEvents, SocketData>(this.adapter).in(
            room
        );
    }

    /**
     * Excludes a room when emitting.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
     * myNamespace.except("room-101").emit("foo", "bar");
     *
     * // with an array of rooms
     * myNamespace.except(["room-101", "room-102"]).emit("foo", "bar");
     *
     * // with multiple chained calls
     * myNamespace.except("room-101").except("room-102").emit("foo", "bar");
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public except(room: Room | Room[]) {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).except(room);
    }

    /**
     * Adds a new client.
     *
     * @return {Socket}
     * @private
     */
    async _add(
        client: Client<ListenEvents, EmitEvents, ServerSideEvents>,
        auth: Record<string, unknown>,
        fn: (
            socket: Socket<
                ListenEvents,
                EmitEvents,
                ServerSideEvents,
                SocketData
            >
        ) => void
    ) {
        const socket = await this._createSocket(client, auth);

        if (
            // @ts-ignore
            this.server.opts.connectionStateRecovery?.skipMiddlewares &&
            socket.recovered &&
            client.conn.readyState === "open"
        ) {
            return this._doConnect(socket, fn);
        }

        this.run(socket, (err) => {
            process.nextTick(() => {
                if ("open" !== client.conn.readyState) {
                    socket._cleanup();
                    return;
                }

                if (err) {
                    socket._cleanup();
                    if (client.conn.protocol === 3) {
                        return socket._error(err.data || err.message);
                    } else {
                        return socket._error({
                            message: err.message,
                            data: err.data,
                        });
                    }
                }

                this._doConnect(socket, fn);
            });
        });
    }

    private async _createSocket(
        client: Client<ListenEvents, EmitEvents, ServerSideEvents>,
        auth: Record<string, unknown>
    ) {
        const sessionId = auth.pid;
        const offset = auth.offset;
        if (
            // @ts-ignore
            this.server.opts.connectionStateRecovery &&
            typeof sessionId === "string" &&
            typeof offset === "string"
        ) {
            let session;
            try {
                session = await this.adapter.restoreSession(sessionId, offset);
            } catch (e) {}
            if (session) {
                return new Socket(this as any, client as any, auth, session);
            }
        }
        return new Socket(this as any, client as any, auth);
    }

    private _doConnect(
        socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>,
        fn: (
            socket: Socket<
                ListenEvents,
                EmitEvents,
                ServerSideEvents,
                SocketData
            >
        ) => void
    ) {
        // track socket
        this.sockets.set(socket.id, socket);

        // it's paramount that the internal `onconnect` logic
        // fires before user-set events to prevent state order
        // violations (such as a disconnection before the connection
        // logic is complete)
        socket._onconnect();
        if (fn) fn(socket);

        // fire user-set events
        this.emitReserved("connect", socket);
        this.emitReserved("connection", socket);
    }

    /**
     * Removes a client. Called by each `Socket`.
     *
     * @private
     */
    _remove(
        socket: Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    ): void {
        if (this.sockets.has(socket.id)) {
            this.sockets.delete(socket.id);
        } else {
        }
    }

    /**
     * Emits to all connected clients.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * myNamespace.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * myNamespace.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the clients
     * myNamespace.timeout(1000).emit("some-event", (err, responses) => {
     *   if (err) {
     *     // some clients did not acknowledge the event in the given delay
     *   } else {
     *     console.log(responses); // one response per client
     *   }
     * });
     *
     * @return Always true
     */
    public emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ): boolean {
        return new BroadcastOperator<EmitEvents, SocketData>(this.adapter).emit(
            ev,
            ...args
        );
    }

    /**
     * Emits an event and waits for an acknowledgement from all clients.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * try {
     *   const responses = await myNamespace.timeout(1000).emitWithAck("some-event");
     *   console.log(responses); // one response per client
     * } catch (e) {
     *   // some clients did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when all clients have acknowledged the event
     */
    public emitWithAck<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: AllButLast<EventParams<EmitEvents, Ev>>
    ): Promise<SecondArg<Last<EventParams<EmitEvents, Ev>>>> {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).emitWithAck(ev, ...args);
    }

    /**
     * Sends a `message` event to all clients.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * myNamespace.send("hello");
     *
     * // this is equivalent to
     * myNamespace.emit("message", "hello");
     *
     * @return self
     */
    public send(...args: EventParams<EmitEvents, "message">): this {
        this.emit("message", ...args);
        return this;
    }

    /**
     * Sends a `message` event to all clients. Sends a `message` event. Alias of {@link send}.
     *
     * @return self
     */
    public write(...args: EventParams<EmitEvents, "message">): this {
        this.emit("message", ...args);
        return this;
    }

    /**
     * Sends a message to the other Socket.IO servers of the cluster.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * myNamespace.serverSideEmit("hello", "world");
     *
     * myNamespace.on("hello", (arg1) => {
     *   console.log(arg1); // prints "world"
     * });
     *
     * // acknowledgements (without binary content) are supported too:
     * myNamespace.serverSideEmit("ping", (err, responses) => {
     *  if (err) {
     *     // some servers did not acknowledge the event in the given delay
     *   } else {
     *     console.log(responses); // one response per server (except the current one)
     *   }
     * });
     *
     * myNamespace.on("ping", (cb) => {
     *   cb("pong");
     * });
     *
     * @param ev - the event name
     * @param args - an array of arguments, which may include an acknowledgement callback at the end
     */
    public serverSideEmit<Ev extends EventNames<ServerSideEvents>>(
        ev: Ev,
        ...args: EventParams<
            DecorateAcknowledgementsWithTimeoutAndMultipleResponses<ServerSideEvents>,
            Ev
        >
    ): boolean {
        if (RESERVED_EVENTS.has(ev)) {
            throw new Error(`"${String(ev)}" is a reserved event name`);
        }
        args.unshift(ev);
        this.adapter.serverSideEmit(args);
        return true;
    }

    /**
     * Sends a message and expect an acknowledgement from the other Socket.IO servers of the cluster.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * try {
     *   const responses = await myNamespace.serverSideEmitWithAck("ping");
     *   console.log(responses); // one response per server (except the current one)
     * } catch (e) {
     *   // some servers did not acknowledge the event in the given delay
     * }
     *
     * @param ev - the event name
     * @param args - an array of arguments
     *
     * @return a Promise that will be fulfilled when all servers have acknowledged the event
     */
    public serverSideEmitWithAck<Ev extends EventNames<ServerSideEvents>>(
        ev: Ev,
        ...args: AllButLast<EventParams<ServerSideEvents, Ev>>
    ): Promise<FirstArg<Last<EventParams<ServerSideEvents, Ev>>>[]> {
        return new Promise((resolve, reject) => {
            args.push((err, responses) => {
                if (err) {
                    err.responses = responses;
                    return reject(err);
                } else {
                    return resolve(responses);
                }
            });
            this.serverSideEmit(
                ev,
                ...(args as any[] as EventParams<ServerSideEvents, Ev>)
            );
        });
    }

    /**
     * Called when a packet is received from another Socket.IO server
     *
     * @param args - an array of arguments, which may include an acknowledgement callback at the end
     *
     * @private
     */
    _onServerSideEmit(args: [string, ...any[]]) {
        super.emitUntyped.apply(this, args);
    }

    /**
     * Gets a list of clients.
     *
     * @deprecated this method will be removed in the next major release, please use {@link Namespace#serverSideEmit} or
     * {@link Namespace#fetchSockets} instead.
     */
    public allSockets(): Promise<Set<SocketId>> {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).allSockets();
    }

    /**
     * Sets the compress flag.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * myNamespace.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    public compress(compress: boolean) {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).compress(compress);
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
     * receive messages (because of network slowness or other issues, or because they’re connected through long polling
     * and is in the middle of a request-response cycle).
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * myNamespace.volatile.emit("hello"); // the clients may or may not receive it
     *
     * @return self
     */
    public get volatile() {
        return new BroadcastOperator<EmitEvents, SocketData>(this.adapter)
            .volatile;
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // the “foo” event will be broadcast to all connected clients on this node
     * myNamespace.local.emit("foo", "bar");
     *
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public get local() {
        return new BroadcastOperator<EmitEvents, SocketData>(this.adapter)
            .local;
    }

    /**
     * Adds a timeout in milliseconds for the next operation.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * myNamespace.timeout(1000).emit("some-event", (err, responses) => {
     *   if (err) {
     *     // some clients did not acknowledge the event in the given delay
     *   } else {
     *     console.log(responses); // one response per client
     *   }
     * });
     *
     * @param timeout
     */
    public timeout(timeout: number) {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).timeout(timeout);
    }

    /**
     * Returns the matching socket instances.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // return all Socket instances
     * const sockets = await myNamespace.fetchSockets();
     *
     * // return all Socket instances in the "room1" room
     * const sockets = await myNamespace.in("room1").fetchSockets();
     *
     * for (const socket of sockets) {
     *   console.log(socket.id);
     *   console.log(socket.handshake);
     *   console.log(socket.rooms);
     *   console.log(socket.data);
     *
     *   socket.emit("hello");
     *   socket.join("room1");
     *   socket.leave("room2");
     *   socket.disconnect();
     * }
     */
    public fetchSockets() {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).fetchSockets();
    }

    /**
     * Makes the matching socket instances join the specified rooms.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // make all socket instances join the "room1" room
     * myNamespace.socketsJoin("room1");
     *
     * // make all socket instances in the "room1" room join the "room2" and "room3" rooms
     * myNamespace.in("room1").socketsJoin(["room2", "room3"]);
     *
     * @param room - a room, or an array of rooms
     */
    public socketsJoin(room: Room | Room[]) {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).socketsJoin(room);
    }

    /**
     * Makes the matching socket instances leave the specified rooms.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // make all socket instances leave the "room1" room
     * myNamespace.socketsLeave("room1");
     *
     * // make all socket instances in the "room1" room leave the "room2" and "room3" rooms
     * myNamespace.in("room1").socketsLeave(["room2", "room3"]);
     *
     * @param room - a room, or an array of rooms
     */
    public socketsLeave(room: Room | Room[]) {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).socketsLeave(room);
    }

    /**
     * Makes the matching socket instances disconnect.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * const myNamespace = io.of("/my-namespace");
     *
     * // make all socket instances disconnect (the connections might be kept alive for other namespaces)
     * myNamespace.disconnectSockets();
     *
     * // make all socket instances in the "room1" room disconnect and close the underlying connections
     * myNamespace.in("room1").disconnectSockets(true);
     *
     * @param close - whether to close the underlying connection
     */
    public disconnectSockets(close: boolean = false) {
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter
        ).disconnectSockets(close);
    }
}

class ParentNamespace<
    ListenEvents extends EventsMap = DefaultEventsMap,
    EmitEvents extends EventsMap = ListenEvents,
    ServerSideEvents extends EventsMap = DefaultEventsMap,
    SocketData = any
> extends Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData> {
    private static count: number = 0;
    private children: Set<
        Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    > = new Set();

    constructor(
        server: Server<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    ) {
        super(server, "/_" + ParentNamespace.count++);
    }

    /**
     * @private
     */
    _initAdapter(): void {
        const broadcast = (packet: any, opts: BroadcastOptions) => {
            this.children.forEach((nsp) => {
                nsp.adapter.broadcast(packet, opts);
            });
        };
        // @ts-ignore FIXME is there a way to declare an inner class in TypeScript?
        this.adapter = { broadcast };
    }

    public emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ): boolean {
        this.children.forEach((nsp) => {
            nsp.emit(ev, ...args);
        });

        return true;
    }

    createChild(
        name: string
    ): Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData> {
        const namespace = new Namespace(this.server, name);
        namespace._fns = this._fns.slice(0);
        this.listeners("connect").forEach((listener) =>
            namespace.on("connect", listener)
        );
        this.listeners("connection").forEach((listener) =>
            namespace.on("connection", listener)
        );
        this.children.add(namespace);

        if (this.server._opts.cleanupEmptyChildNamespaces) {
            const remove = namespace._remove;

            namespace._remove = (socket) => {
                remove.call(namespace, socket);
                if (namespace.sockets.size === 0) {
                    namespace.adapter.close();
                    this.server._nsps.delete(namespace.name);
                    this.children.delete(namespace);
                }
            };
        }

        this.server._nsps.set(name, namespace);

        // @ts-ignore
        this.server.sockets.emitReserved("new_namespace", namespace);

        return namespace;
    }

    fetchSockets(): Promise<RemoteSocket<EmitEvents, SocketData>[]> {
        // note: we could make the fetchSockets() method work for dynamic namespaces created with a regex (by sending the
        // regex to the other Socket.IO servers, and returning the sockets of each matching namespace for example), but
        // the behavior for namespaces created with a function is less clear
        // note²: we cannot loop over each children namespace, because with multiple Socket.IO servers, a given namespace
        // may exist on one node but not exist on another (since it is created upon client connection)
        throw new Error("fetchSockets() is not supported on parent namespaces");
    }
}

class RemoteSocket<EmitEvents extends EventsMap, SocketData>
    implements TypedEventBroadcaster<EmitEvents>
{
    public readonly id: SocketId;
    public readonly handshake: Handshake;
    public readonly rooms: Set<Room>;
    public readonly data: SocketData;

    private readonly operator: BroadcastOperator<EmitEvents, SocketData>;

    constructor(adapter: Adapter, details: SocketDetails<SocketData>) {
        this.id = details.id;
        this.handshake = details.handshake;
        this.rooms = new Set(details.rooms);
        this.data = details.data;
        this.operator = new BroadcastOperator<EmitEvents, SocketData>(
            adapter,
            new Set([this.id]),
            new Set(),
            {
                expectSingleResponse: true, // so that remoteSocket.emit() with acknowledgement behaves like socket.emit()
            }
        );
    }

    /**
     * Adds a timeout in milliseconds for the next operation.
     *
     * @example
     * const sockets = await io.fetchSockets();
     *
     * for (const socket of sockets) {
     *   if (someCondition) {
     *     socket.timeout(1000).emit("some-event", (err) => {
     *       if (err) {
     *         // the client did not acknowledge the event in the given delay
     *       }
     *     });
     *   }
     * }
     *
     * // note: if possible, using a room instead of looping over all sockets is preferable
     * io.timeout(1000).to(someConditionRoom).emit("some-event", (err, responses) => {
     *   // ...
     * });
     *
     * @param timeout
     */
    public timeout(timeout: number) {
        return this.operator.timeout(timeout) as BroadcastOperator<
            DecorateAcknowledgements<EmitEvents>,
            SocketData
        >;
    }

    public emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ): boolean {
        return this.operator.emit(ev, ...args);
    }

    /**
     * Joins a room.
     *
     * @param {String|Array} room - room or array of rooms
     */
    public join(room: Room | Room[]): void {
        return this.operator.socketsJoin(room);
    }

    /**
     * Leaves a room.
     *
     * @param {String} room
     */
    public leave(room: Room): void {
        return this.operator.socketsLeave(room);
    }

    /**
     * Disconnects this client.
     *
     * @param {Boolean} close - if `true`, closes the underlying connection
     * @return {Socket} self
     */
    public disconnect(close = false): this {
        this.operator.disconnectSockets(close);
        return this;
    }
}

class BroadcastOperator<EmitEvents extends EventsMap, SocketData>
    implements TypedEventBroadcaster<EmitEvents>
{
    constructor(
        private readonly adapter: Adapter,
        private readonly rooms: Set<Room> = new Set<Room>(),
        private readonly exceptRooms: Set<Room> = new Set<Room>(),
        private readonly flags: BroadcastFlags & {
            expectSingleResponse?: boolean;
        } = {}
    ) {}

    /**
     * Targets a room when emitting.
     *
     * @example
     * // the “foo” event will be broadcast to all connected clients in the “room-101” room
     * io.to("room-101").emit("foo", "bar");
     *
     * // with an array of rooms (a client will be notified at most once)
     * io.to(["room-101", "room-102"]).emit("foo", "bar");
     *
     * // with multiple chained calls
     * io.to("room-101").to("room-102").emit("foo", "bar");
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public to(room: Room | Room[]) {
        const rooms = new Set(this.rooms);
        if (Array.isArray(room)) {
            room.forEach((r) => rooms.add(r));
        } else {
            rooms.add(room);
        }
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter,
            rooms,
            this.exceptRooms,
            this.flags
        );
    }

    /**
     * Targets a room when emitting. Similar to `to()`, but might feel clearer in some cases:
     *
     * @example
     * // disconnect all clients in the "room-101" room
     * io.in("room-101").disconnectSockets();
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public in(room: Room | Room[]) {
        return this.to(room);
    }

    /**
     * Excludes a room when emitting.
     *
     * @example
     * // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
     * io.except("room-101").emit("foo", "bar");
     *
     * // with an array of rooms
     * io.except(["room-101", "room-102"]).emit("foo", "bar");
     *
     * // with multiple chained calls
     * io.except("room-101").except("room-102").emit("foo", "bar");
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public except(room: Room | Room[]) {
        const exceptRooms = new Set(this.exceptRooms);
        if (Array.isArray(room)) {
            room.forEach((r) => exceptRooms.add(r));
        } else {
            exceptRooms.add(room);
        }
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter,
            this.rooms,
            exceptRooms,
            this.flags
        );
    }

    /**
     * Sets the compress flag.
     *
     * @example
     * io.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return a new BroadcastOperator instance
     */
    public compress(compress: boolean) {
        const flags = Object.assign({}, this.flags, { compress });
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter,
            this.rooms,
            this.exceptRooms,
            flags
        );
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
     * receive messages (because of network slowness or other issues, or because they’re connected through long polling
     * and is in the middle of a request-response cycle).
     *
     * @example
     * io.volatile.emit("hello"); // the clients may or may not receive it
     *
     * @return a new BroadcastOperator instance
     */
    public get volatile() {
        const flags = Object.assign({}, this.flags, { volatile: true });
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter,
            this.rooms,
            this.exceptRooms,
            flags
        );
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
     *
     * @example
     * // the “foo” event will be broadcast to all connected clients on this node
     * io.local.emit("foo", "bar");
     *
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public get local() {
        const flags = Object.assign({}, this.flags, { local: true });
        return new BroadcastOperator<EmitEvents, SocketData>(
            this.adapter,
            this.rooms,
            this.exceptRooms,
            flags
        );
    }

    /**
     * Adds a timeout in milliseconds for the next operation
     *
     * @example
     * io.timeout(1000).emit("some-event", (err, responses) => {
     *   if (err) {
     *     // some clients did not acknowledge the event in the given delay
     *   } else {
     *     console.log(responses); // one response per client
     *   }
     * });
     *
     * @param timeout
     */
    public timeout(timeout: number) {
        const flags = Object.assign({}, this.flags, { timeout });
        return new BroadcastOperator<
            DecorateAcknowledgementsWithTimeoutAndMultipleResponses<EmitEvents>,
            SocketData
        >(this.adapter, this.rooms, this.exceptRooms, flags);
    }

    /**
     * Emits to all clients.
     *
     * @example
     * // the “foo” event will be broadcast to all connected clients
     * io.emit("foo", "bar");
     *
     * // the “foo” event will be broadcast to all connected clients in the “room-101” room
     * io.to("room-101").emit("foo", "bar");
     *
     * // with an acknowledgement expected from all connected clients
     * io.timeout(1000).emit("some-event", (err, responses) => {
     *   if (err) {
     *     // some clients did not acknowledge the event in the given delay
     *   } else {
     *     console.log(responses); // one response per client
     *   }
     * });
     *
     * @return Always true
     */
    public emit<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: EventParams<EmitEvents, Ev>
    ): boolean {
        if (RESERVED_EVENTS.has(ev)) {
            throw new Error(`"${String(ev)}" is a reserved event name`);
        }
        // set up packet object
        const data = [ev, ...args];
        const packet = {
            type: PacketType.EVENT,
            data: data,
        };

        const withAck = typeof data[data.length - 1] === "function";

        if (!withAck) {
            this.adapter.broadcast(packet, {
                rooms: this.rooms,
                except: this.exceptRooms,
                flags: this.flags,
            });

            return true;
        }

        const ack = data.pop() as (...args: any[]) => void;
        let timedOut = false;
        let responses: any[] = [];

        const timer = setTimeout(() => {
            timedOut = true;
            ack.apply(this, [
                new Error("operation has timed out"),
                this.flags.expectSingleResponse ? null : responses,
            ]);
        }, this.flags.timeout);

        let expectedServerCount = -1;
        let actualServerCount = 0;
        let expectedClientCount = 0;

        const checkCompleteness = () => {
            if (
                !timedOut &&
                expectedServerCount === actualServerCount &&
                responses.length === expectedClientCount
            ) {
                clearTimeout(timer);
                ack.apply(this, [
                    null,
                    this.flags.expectSingleResponse ? null : responses,
                ]);
            }
        };

        this.adapter.broadcastWithAck(
            packet,
            {
                rooms: this.rooms,
                except: this.exceptRooms,
                flags: this.flags,
            },
            (clientCount) => {
                // each Socket.IO server in the cluster sends the number of clients that were notified
                expectedClientCount += clientCount;
                actualServerCount++;
                checkCompleteness();
            },
            (clientResponse) => {
                // each client sends an acknowledgement
                responses.push(clientResponse);
                checkCompleteness();
            }
        );

        this.adapter.serverCount().then((serverCount) => {
            expectedServerCount = serverCount;
            checkCompleteness();
        });

        return true;
    }

    /**
     * Emits an event and waits for an acknowledgement from all clients.
     *
     * @example
     * try {
     *   const responses = await io.timeout(1000).emitWithAck("some-event");
     *   console.log(responses); // one response per client
     * } catch (e) {
     *   // some clients did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when all clients have acknowledged the event
     */
    public emitWithAck<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: AllButLast<EventParams<EmitEvents, Ev>>
    ): Promise<SecondArg<Last<EventParams<EmitEvents, Ev>>>> {
        return new Promise((resolve, reject) => {
            args.push((err, responses) => {
                if (err) {
                    err.responses = responses;
                    return reject(err);
                } else {
                    return resolve(responses);
                }
            });
            this.emit(ev, ...(args as any[] as EventParams<EmitEvents, Ev>));
        });
    }

    /**
     * Gets a list of clients.
     *
     * @deprecated this method will be removed in the next major release, please use {@link Server#serverSideEmit} or
     * {@link fetchSockets} instead.
     */
    public allSockets(): Promise<Set<SocketId>> {
        if (!this.adapter) {
            throw new Error(
                "No adapter for this namespace, are you trying to get the list of clients of a dynamic namespace?"
            );
        }
        return this.adapter.sockets(this.rooms);
    }

    /**
     * Returns the matching socket instances. This method works across a cluster of several Socket.IO servers.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * // return all Socket instances
     * const sockets = await io.fetchSockets();
     *
     * // return all Socket instances in the "room1" room
     * const sockets = await io.in("room1").fetchSockets();
     *
     * for (const socket of sockets) {
     *   console.log(socket.id);
     *   console.log(socket.handshake);
     *   console.log(socket.rooms);
     *   console.log(socket.data);
     *
     *   socket.emit("hello");
     *   socket.join("room1");
     *   socket.leave("room2");
     *   socket.disconnect();
     * }
     */
    public fetchSockets(): Promise<RemoteSocket<EmitEvents, SocketData>[]> {
        return this.adapter
            .fetchSockets({
                rooms: this.rooms,
                except: this.exceptRooms,
                flags: this.flags,
            })
            .then((sockets) => {
                return sockets.map((socket) => {
                    if (socket instanceof Socket) {
                        // FIXME the TypeScript compiler complains about missing private properties
                        return socket as unknown as RemoteSocket<
                            EmitEvents,
                            SocketData
                        >;
                    } else {
                        return new RemoteSocket(
                            this.adapter,
                            socket as SocketDetails<SocketData>
                        );
                    }
                });
            });
    }

    /**
     * Makes the matching socket instances join the specified rooms.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     *
     * // make all socket instances join the "room1" room
     * io.socketsJoin("room1");
     *
     * // make all socket instances in the "room1" room join the "room2" and "room3" rooms
     * io.in("room1").socketsJoin(["room2", "room3"]);
     *
     * @param room - a room, or an array of rooms
     */
    public socketsJoin(room: Room | Room[]): void {
        this.adapter.addSockets(
            {
                rooms: this.rooms,
                except: this.exceptRooms,
                flags: this.flags,
            },
            Array.isArray(room) ? room : [room]
        );
    }

    /**
     * Makes the matching socket instances leave the specified rooms.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * // make all socket instances leave the "room1" room
     * io.socketsLeave("room1");
     *
     * // make all socket instances in the "room1" room leave the "room2" and "room3" rooms
     * io.in("room1").socketsLeave(["room2", "room3"]);
     *
     * @param room - a room, or an array of rooms
     */
    public socketsLeave(room: Room | Room[]): void {
        this.adapter.delSockets(
            {
                rooms: this.rooms,
                except: this.exceptRooms,
                flags: this.flags,
            },
            Array.isArray(room) ? room : [room]
        );
    }

    /**
     * Makes the matching socket instances disconnect.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * // make all socket instances disconnect (the connections might be kept alive for other namespaces)
     * io.disconnectSockets();
     *
     * // make all socket instances in the "room1" room disconnect and close the underlying connections
     * io.in("room1").disconnectSockets(true);
     *
     * @param close - whether to close the underlying connection
     */
    public disconnectSockets(close: boolean = false): void {
        this.adapter.disconnectSockets(
            {
                rooms: this.rooms,
                except: this.exceptRooms,
                flags: this.flags,
            },
            close
        );
    }
}

export class Server<
    ListenEvents extends EventsMap = DefaultEventsMap,
    EmitEvents extends EventsMap = ListenEvents,
    ServerSideEvents extends EventsMap = DefaultEventsMap,
    SocketData = any
> extends StrictEventEmitter<
    ServerSideEvents,
    EmitEvents,
    ServerReservedEventsMap<
        ListenEvents,
        EmitEvents,
        ServerSideEvents,
        SocketData
    >
> {
    public readonly sockets: Namespace<
        ListenEvents,
        EmitEvents,
        ServerSideEvents,
        SocketData
    >;
    /**
     * A reference to the underlying Engine.IO server.
     *
     * @example
     * const clientsCount = io.engine.clientsCount;
     *
     */
    public engine: BaseServer;

    /** @private */
    readonly _parser: typeof parser;
    /** @private */
    readonly encoder: Encoder;

    /**
     * @private
     */
    _nsps: Map<
        string,
        Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    > = new Map();
    private parentNsps: Map<
        ParentNspNameMatchFn,
        ParentNamespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    > = new Map();

    /**
     * A subset of the {@link parentNsps} map, only containing {@link ParentNamespace} which are based on a regular
     * expression.
     *
     * @private
     */
    private parentNamespacesFromRegExp: Map<
        RegExp,
        ParentNamespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData>
    > = new Map();

    private _adapter?: AdapterConstructor;
    private _serveClient: boolean;
    private readonly opts: Partial<ServerOptions>;
    private eio: Engine;
    private _path: string;
    private clientPathRegex: RegExp;

    /**
     * @private
     */
    _connectTimeout: number;
    private httpServer: http.Server | HTTPSServer;
    private _corsMiddleware: (
        req: http.IncomingMessage,
        res: http.ServerResponse,
        next: () => void
    ) => void;

    /**
     * Server constructor.
     *
     * @param srv http server, port, or options
     * @param [opts]
     */
    constructor(opts?: Partial<ServerOptions>);
    constructor(
        srv?: http.Server | HTTPSServer | number,
        opts?: Partial<ServerOptions>
    );
    constructor(
        srv:
            | undefined
            | Partial<ServerOptions>
            | http.Server
            | HTTPSServer
            | number,
        opts?: Partial<ServerOptions>
    );
    constructor(
        srv:
            | undefined
            | Partial<ServerOptions>
            | http.Server
            | HTTPSServer
            | number,
        opts: Partial<ServerOptions> = {}
    ) {
        super();
        if (
            "object" === typeof srv &&
            srv instanceof Object &&
            !(srv as Partial<http.Server>).listen
        ) {
            opts = srv as Partial<ServerOptions>;
            srv = undefined;
        }
        this.path(opts.path || "/socket.io");
        this.connectTimeout(opts.connectTimeout || 45000);
        this.serveClient(false !== opts.serveClient);
        this._parser = opts.parser || parser;
        this.encoder = new this._parser.Encoder();
        this.opts = opts;
        if (opts.connectionStateRecovery) {
            opts.connectionStateRecovery = Object.assign(
                {
                    maxDisconnectionDuration: 2 * 60 * 1000,
                    skipMiddlewares: true,
                },
                opts.connectionStateRecovery
            );
            this.adapter(opts.adapter || SessionAwareAdapter);
        } else {
            this.adapter(opts.adapter || Adapter);
        }
        opts.cleanupEmptyChildNamespaces = !!opts.cleanupEmptyChildNamespaces;
        this.sockets = this.of("/");
        if (srv || typeof srv == "number")
            this.attach(srv as http.Server | HTTPSServer | number);

        if (this.opts.cors) {
        }
    }

    get _opts() {
        return this.opts;
    }

    /**
     * Sets/gets whether client code is being served.
     *
     * @param v - whether to serve client code
     * @return self when setting or value when getting
     */
    public serveClient(v: boolean): this;
    public serveClient(): boolean;
    public serveClient(v?: boolean): this | boolean;
    public serveClient(v?: boolean): this | boolean {
        if (!arguments.length) return this._serveClient;
        this._serveClient = v!;
        return this;
    }

    /**
     * Executes the middleware for an incoming namespace not already created on the server.
     *
     * @param name - name of incoming namespace
     * @param auth - the auth parameters
     * @param fn - callback
     *
     * @private
     */
    _checkNamespace(
        name: string,
        auth: { [key: string]: any },
        fn: (
            nsp:
                | Namespace<
                      ListenEvents,
                      EmitEvents,
                      ServerSideEvents,
                      SocketData
                  >
                | false
        ) => void
    ): void {
        if (this.parentNsps.size === 0) return fn(false);

        const keysIterator = this.parentNsps.keys();

        const run = () => {
            const nextFn = keysIterator.next();
            if (nextFn.done) {
                return fn(false);
            }
            nextFn.value(name, auth, (err, allow) => {
                if (err || !allow) {
                    return run();
                }
                if (this._nsps.has(name)) {
                    // the namespace was created in the meantime
                    return fn(this._nsps.get(name) as Namespace);
                }
                const namespace = this.parentNsps
                    .get(nextFn.value)!
                    .createChild(name);
                fn(namespace as any);
            });
        };

        run();
    }

    /**
     * Sets the client serving path.
     *
     * @param {String} v pathname
     * @return {Server|String} self when setting or value when getting
     */
    public path(v: string): this;
    public path(): string;
    public path(v?: string): this | string;
    public path(v?: string): this | string {
        if (!arguments.length) return this._path;

        this._path = v!.replace(/\/$/, "");

        const escapedPath = this._path.replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            "\\$&"
        );
        this.clientPathRegex = new RegExp(
            "^" +
                escapedPath +
                "/socket\\.io(\\.msgpack|\\.esm)?(\\.min)?\\.js(\\.map)?(?:\\?|$)"
        );
        return this;
    }

    /**
     * Set the delay after which a client without namespace is closed
     * @param v
     */
    public connectTimeout(v: number): this;
    public connectTimeout(): number;
    public connectTimeout(v?: number): this | number;
    public connectTimeout(v?: number): this | number {
        if (v === undefined) return this._connectTimeout;
        this._connectTimeout = v;
        return this;
    }

    /**
     * Sets the adapter for rooms.
     *
     * @param v pathname
     * @return self when setting or value when getting
     */
    public adapter(): AdapterConstructor | undefined;
    public adapter(v: AdapterConstructor): this;
    public adapter(
        v?: AdapterConstructor
    ): AdapterConstructor | undefined | this {
        if (!arguments.length) return this._adapter;
        this._adapter = v;
        for (const nsp of this._nsps.values()) {
            nsp._initAdapter();
        }
        return this;
    }

    /**
     * Attaches socket.io to a server or port.
     *
     * @param srv - server or port
     * @param opts - options passed to engine.io
     * @return self
     */
    public listen(
        srv: http.Server | HTTPSServer | number,
        opts: Partial<ServerOptions> = {}
    ): this {
        return this.attach(srv, opts);
    }

    /**
     * Attaches socket.io to a server or port.
     *
     * @param srv - server or port
     * @param opts - options passed to engine.io
     * @return self
     */
    public attach(
        srv: http.Server | HTTPSServer | number,
        opts: Partial<ServerOptions> = {}
    ): this {
        if ("function" == typeof srv) {
            const msg =
                "You are trying to attach socket.io to an express " +
                "request handler function. Please pass a http.Server instance.";
            throw new Error(msg);
        }

        // handle a port as a string
        if (Number(srv) == srv) {
            srv = Number(srv);
        }

        if ("number" == typeof srv) {
            const port = srv;
            srv = http.createServer((req, res) => {
                res.writeHead(404);
                res.end();
            });
            srv.listen(port);
        }

        // merge the options passed to the Socket.IO server
        Object.assign(opts, this.opts);
        // set engine.io path to `/socket.io`
        opts.path = opts.path || this._path;

        this.initEngine(srv, opts);

        return this;
    }

    public attachApp(
        app /*: TemplatedApp */,
        opts: Partial<ServerOptions> = {}
    ) {
        // merge the options passed to the Socket.IO server
        Object.assign(opts, this.opts);
        // set engine.io path to `/socket.io`
        opts.path = opts.path || this._path;

        // initialize engine
        const engine = new uServer(opts);

        engine.attach(app, opts);

        // bind to engine events
        this.bind(engine);

        if (this._serveClient) {
            // attach static file serving
            app.get(`${this._path}/*`, (res, req) => {
                if (!this.clientPathRegex.test(req.getUrl())) {
                    req.setYield(true);
                    return;
                }

                const filename = req
                    .getUrl()
                    .replace(this._path, "")
                    .replace(/\?.*$/, "")
                    .replace(/^\//, "");
                const isMap = dotMapRegex.test(filename);
                const type = isMap ? "map" : "source";

                // Per the standard, ETags must be quoted:
                // https://tools.ietf.org/html/rfc7232#section-2.3
                const expectedEtag = '"' + clientVersion + '"';
                const weakEtag = "W/" + expectedEtag;

                const etag = req.getHeader("if-none-match");
                if (etag) {
                    if (expectedEtag === etag || weakEtag === etag) {
                        res.writeStatus("304 Not Modified");
                        res.end();
                        return;
                    }
                }

                res.writeHeader("cache-control", "public, max-age=0");
                res.writeHeader(
                    "content-type",
                    "application/" +
                        (isMap ? "json" : "javascript") +
                        "; charset=utf-8"
                );
                res.writeHeader("etag", expectedEtag);

                const filepath = path.join(
                    __dirname,
                    "../client-dist/",
                    filename
                );
                serveFile(res, filepath);
            });
        }

        patchAdapter(app);
    }

    /**
     * Initialize engine
     *
     * @param srv - the server to attach to
     * @param opts - options passed to engine.io
     * @private
     */
    private initEngine(
        srv: http.Server | HTTPSServer,
        opts: EngineOptions & AttachOptions
    ): void {
        // initialize engine
        this.eio = attach(srv, opts);

        // attach static file serving
        if (this._serveClient) this.attachServe(srv);

        // Export http server
        this.httpServer = srv;

        // bind to engine events
        this.bind(this.eio);
    }

    /**
     * Attaches the static file serving.
     *
     * @param srv http server
     * @private
     */
    private attachServe(srv: http.Server | HTTPSServer): void {
        const evs = srv.listeners("request").slice(0);
        srv.removeAllListeners("request");
        srv.on("request", (req, res) => {
            if (this.clientPathRegex.test(req.url!)) {
                if (this._corsMiddleware) {
                    this._corsMiddleware(req, res, () => {
                        this.serve(req, res);
                    });
                } else {
                    this.serve(req, res);
                }
            } else {
                for (let i = 0; i < evs.length; i++) {
                    evs[i].call(srv, req, res);
                }
            }
        });
    }

    /**
     * Handles a request serving of client source and map
     *
     * @param req
     * @param res
     * @private
     */
    private serve(req: http.IncomingMessage, res: http.ServerResponse): void {
        const filename = req.url!.replace(this._path, "").replace(/\?.*$/, "");
        const isMap = dotMapRegex.test(filename);
        const type = isMap ? "map" : "source";

        // Per the standard, ETags must be quoted:
        // https://tools.ietf.org/html/rfc7232#section-2.3
        const expectedEtag = '"' + clientVersion + '"';
        const weakEtag = "W/" + expectedEtag;

        const etag = req.headers["if-none-match"];
        if (etag) {
            if (expectedEtag === etag || weakEtag === etag) {
                res.writeHead(304);
                res.end();
                return;
            }
        }

        res.setHeader("Cache-Control", "public, max-age=0");
        res.setHeader(
            "Content-Type",
            "application/" + (isMap ? "json" : "javascript") + "; charset=utf-8"
        );
        res.setHeader("ETag", expectedEtag);

        Server.sendFile(filename, req, res);
    }

    /**
     * @param filename
     * @param req
     * @param res
     * @private
     */
    private static sendFile(
        filename: string,
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): void {
        const readStream = createReadStream(
            path.join(__dirname, "../client-dist/", filename)
        );
        const encoding = accepts(req).encodings(["br", "gzip", "deflate"]);

        const onError = (err: NodeJS.ErrnoException | null) => {
            if (err) {
                res.end();
            }
        };

        switch (encoding) {
            case "br":
                res.writeHead(200, { "content-encoding": "br" });
                readStream.pipe(createBrotliCompress()).pipe(res);
                pipeline(readStream, createBrotliCompress(), res, onError);
                break;
            case "gzip":
                res.writeHead(200, { "content-encoding": "gzip" });
                pipeline(readStream, createGzip(), res, onError);
                break;
            case "deflate":
                res.writeHead(200, { "content-encoding": "deflate" });
                pipeline(readStream, createDeflate(), res, onError);
                break;
            default:
                res.writeHead(200);
                pipeline(readStream, res, onError);
        }
    }

    /**
     * Binds socket.io to an engine.io instance.
     *
     * @param engine engine.io (or compatible) server
     * @return self
     */
    public bind(engine: BaseServer): this {
        this.engine = engine;
        this.engine.on("connection", this.onconnection.bind(this));
        return this;
    }

    /**
     * Called with each incoming transport connection.
     *
     * @param {engine.Socket} conn
     * @return self
     * @private
     */
    private onconnection(conn): this {
        const client = new Client(this, conn);
        if (conn.protocol === 3) {
            // @ts-ignore
            client.connect("/");
        }
        return this;
    }

    /**
     * Looks up a namespace.
     *
     * @example
     * // with a simple string
     * const myNamespace = io.of("/my-namespace");
     *
     * // with a regex
     * const dynamicNsp = io.of(/^\/dynamic-\d+$/).on("connection", (socket) => {
     *   const namespace = socket.nsp; // newNamespace.name === "/dynamic-101"
     *
     *   // broadcast to all clients in the given sub-namespace
     *   namespace.emit("hello");
     * });
     *
     * @param name - nsp name
     * @param fn optional, nsp `connection` ev handler
     */
    public of(
        name: string | RegExp | ParentNspNameMatchFn,
        fn?: (
            socket: Socket<
                ListenEvents,
                EmitEvents,
                ServerSideEvents,
                SocketData
            >
        ) => void
    ): Namespace<ListenEvents, EmitEvents, ServerSideEvents, SocketData> {
        if (typeof name === "function" || name instanceof RegExp) {
            const parentNsp = new ParentNamespace(this);
            if (typeof name === "function") {
                this.parentNsps.set(name, parentNsp);
            } else {
                this.parentNsps.set(
                    (nsp, conn, next) => next(null, (name as RegExp).test(nsp)),
                    parentNsp
                );
                this.parentNamespacesFromRegExp.set(name, parentNsp);
            }
            if (fn) {
                // @ts-ignore
                parentNsp.on("connect", fn);
            }
            return parentNsp as any;
        }

        if (String(name)[0] !== "/") name = "/" + name;

        let nsp = this._nsps.get(name);
        if (!nsp) {
            for (const [regex, parentNamespace] of this
                .parentNamespacesFromRegExp) {
                if (regex.test(name as string)) {
                    return parentNamespace.createChild(name as string) as any;
                }
            }

            nsp = new Namespace(this, name);
            this._nsps.set(name, nsp);
            if (name !== "/") {
                // @ts-ignore
                this.sockets.emitReserved("new_namespace", nsp);
            }
        }
        if (fn) nsp.on("connect", fn);
        return nsp;
    }

    /**
     * Closes server connection
     *
     * @param [fn] optional, called as `fn([err])` on error OR all conns closed
     */
    public close(fn?: (err?: Error) => void): void {
        for (const socket of this.sockets.sockets.values()) {
            socket._onclose("server shutting down");
        }

        this.engine.close();

        // restore the Adapter prototype
        restoreAdapter();

        if (this.httpServer) {
            this.httpServer.close(fn);
        } else {
            fn && fn();
        }
    }

    /**
     * Registers a middleware, which is a function that gets executed for every incoming {@link Socket}.
     *
     * @example
     * io.use((socket, next) => {
     *   // ...
     *   next();
     * });
     *
     * @param fn - the middleware function
     */
    public use(
        fn: (
            socket: Socket<
                ListenEvents,
                EmitEvents,
                ServerSideEvents,
                SocketData
            >,
            next: (err?: ExtendedError) => void
        ) => void
    ): this {
        this.sockets.use(fn);
        return this;
    }

    /**
     * Targets a room when emitting.
     *
     * @example
     * // the “foo” event will be broadcast to all connected clients in the “room-101” room
     * io.to("room-101").emit("foo", "bar");
     *
     * // with an array of rooms (a client will be notified at most once)
     * io.to(["room-101", "room-102"]).emit("foo", "bar");
     *
     * // with multiple chained calls
     * io.to("room-101").to("room-102").emit("foo", "bar");
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public to(room: Room | Room[]) {
        return this.sockets.to(room);
    }

    /**
     * Targets a room when emitting. Similar to `to()`, but might feel clearer in some cases:
     *
     * @example
     * // disconnect all clients in the "room-101" room
     * io.in("room-101").disconnectSockets();
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public in(room: Room | Room[]) {
        return this.sockets.in(room);
    }

    /**
     * Excludes a room when emitting.
     *
     * @example
     * // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
     * io.except("room-101").emit("foo", "bar");
     *
     * // with an array of rooms
     * io.except(["room-101", "room-102"]).emit("foo", "bar");
     *
     * // with multiple chained calls
     * io.except("room-101").except("room-102").emit("foo", "bar");
     *
     * @param room - a room, or an array of rooms
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public except(room: Room | Room[]) {
        return this.sockets.except(room);
    }

    /**
     * Emits an event and waits for an acknowledgement from all clients.
     *
     * @example
     * try {
     *   const responses = await io.timeout(1000).emitWithAck("some-event");
     *   console.log(responses); // one response per client
     * } catch (e) {
     *   // some clients did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when all clients have acknowledged the event
     */
    public emitWithAck<Ev extends EventNames<EmitEvents>>(
        ev: Ev,
        ...args: AllButLast<EventParams<EmitEvents, Ev>>
    ): Promise<SecondArg<Last<EventParams<EmitEvents, Ev>>>> {
        return this.sockets.emitWithAck(ev, ...args);
    }

    /**
     * Sends a `message` event to all clients.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * io.send("hello");
     *
     * // this is equivalent to
     * io.emit("message", "hello");
     *
     * @return self
     */
    public send(...args: EventParams<EmitEvents, "message">): this {
        this.sockets.emit("message", ...args);
        return this;
    }

    /**
     * Sends a `message` event to all clients. Alias of {@link send}.
     *
     * @return self
     */
    public write(...args: EventParams<EmitEvents, "message">): this {
        this.sockets.emit("message", ...args);
        return this;
    }

    /**
     * Sends a message to the other Socket.IO servers of the cluster.
     *
     * @example
     * io.serverSideEmit("hello", "world");
     *
     * io.on("hello", (arg1) => {
     *   console.log(arg1); // prints "world"
     * });
     *
     * // acknowledgements (without binary content) are supported too:
     * io.serverSideEmit("ping", (err, responses) => {
     *  if (err) {
     *     // some servers did not acknowledge the event in the given delay
     *   } else {
     *     console.log(responses); // one response per server (except the current one)
     *   }
     * });
     *
     * io.on("ping", (cb) => {
     *   cb("pong");
     * });
     *
     * @param ev - the event name
     * @param args - an array of arguments, which may include an acknowledgement callback at the end
     */
    public serverSideEmit<Ev extends EventNames<ServerSideEvents>>(
        ev: Ev,
        ...args: EventParams<
            DecorateAcknowledgementsWithTimeoutAndMultipleResponses<ServerSideEvents>,
            Ev
        >
    ): boolean {
        return this.sockets.serverSideEmit(ev, ...args);
    }

    /**
     * Sends a message and expect an acknowledgement from the other Socket.IO servers of the cluster.
     *
     * @example
     * try {
     *   const responses = await io.serverSideEmitWithAck("ping");
     *   console.log(responses); // one response per server (except the current one)
     * } catch (e) {
     *   // some servers did not acknowledge the event in the given delay
     * }
     *
     * @param ev - the event name
     * @param args - an array of arguments
     *
     * @return a Promise that will be fulfilled when all servers have acknowledged the event
     */
    public serverSideEmitWithAck<Ev extends EventNames<ServerSideEvents>>(
        ev: Ev,
        ...args: AllButLast<EventParams<ServerSideEvents, Ev>>
    ): Promise<FirstArg<Last<EventParams<ServerSideEvents, Ev>>>[]> {
        return this.sockets.serverSideEmitWithAck(ev, ...args);
    }

    /**
     * Gets a list of socket ids.
     *
     * @deprecated this method will be removed in the next major release, please use {@link Server#serverSideEmit} or
     * {@link Server#fetchSockets} instead.
     */
    public allSockets(): Promise<Set<SocketId>> {
        return this.sockets.allSockets();
    }

    /**
     * Sets the compress flag.
     *
     * @example
     * io.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public compress(compress: boolean) {
        return this.sockets.compress(compress);
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
     * receive messages (because of network slowness or other issues, or because they’re connected through long polling
     * and is in the middle of a request-response cycle).
     *
     * @example
     * io.volatile.emit("hello"); // the clients may or may not receive it
     *
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public get volatile() {
        return this.sockets.volatile;
    }

    /**
     * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
     *
     * @example
     * // the “foo” event will be broadcast to all connected clients on this node
     * io.local.emit("foo", "bar");
     *
     * @return a new {@link BroadcastOperator} instance for chaining
     */
    public get local() {
        return this.sockets.local;
    }

    /**
     * Adds a timeout in milliseconds for the next operation.
     *
     * @example
     * io.timeout(1000).emit("some-event", (err, responses) => {
     *   if (err) {
     *     // some clients did not acknowledge the event in the given delay
     *   } else {
     *     console.log(responses); // one response per client
     *   }
     * });
     *
     * @param timeout
     */
    public timeout(timeout: number) {
        return this.sockets.timeout(timeout);
    }

    /**
     * Returns the matching socket instances.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * // return all Socket instances
     * const sockets = await io.fetchSockets();
     *
     * // return all Socket instances in the "room1" room
     * const sockets = await io.in("room1").fetchSockets();
     *
     * for (const socket of sockets) {
     *   console.log(socket.id);
     *   console.log(socket.handshake);
     *   console.log(socket.rooms);
     *   console.log(socket.data);
     *
     *   socket.emit("hello");
     *   socket.join("room1");
     *   socket.leave("room2");
     *   socket.disconnect();
     * }
     */
    public fetchSockets(): Promise<RemoteSocket<EmitEvents, SocketData>[]> {
        return this.sockets.fetchSockets();
    }

    /**
     * Makes the matching socket instances join the specified rooms.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     *
     * // make all socket instances join the "room1" room
     * io.socketsJoin("room1");
     *
     * // make all socket instances in the "room1" room join the "room2" and "room3" rooms
     * io.in("room1").socketsJoin(["room2", "room3"]);
     *
     * @param room - a room, or an array of rooms
     */
    public socketsJoin(room: Room | Room[]) {
        return this.sockets.socketsJoin(room);
    }

    /**
     * Makes the matching socket instances leave the specified rooms.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * // make all socket instances leave the "room1" room
     * io.socketsLeave("room1");
     *
     * // make all socket instances in the "room1" room leave the "room2" and "room3" rooms
     * io.in("room1").socketsLeave(["room2", "room3"]);
     *
     * @param room - a room, or an array of rooms
     */
    public socketsLeave(room: Room | Room[]) {
        return this.sockets.socketsLeave(room);
    }

    /**
     * Makes the matching socket instances disconnect.
     *
     * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
     *
     * @example
     * // make all socket instances disconnect (the connections might be kept alive for other namespaces)
     * io.disconnectSockets();
     *
     * // make all socket instances in the "room1" room disconnect and close the underlying connections
     * io.in("room1").disconnectSockets(true);
     *
     * @param close - whether to close the underlying connection
     */
    public disconnectSockets(close: boolean = false) {
        return this.sockets.disconnectSockets(close);
    }
}

/**
 * Expose main namespace (/).
 */

const emitterMethods = Object.keys(EventEmitter.prototype).filter(function (
    key
) {
    return typeof EventEmitter.prototype[key] === "function";
});

emitterMethods.forEach(function (fn) {
    Server.prototype[fn] = function () {
        return this.sockets[fn].apply(this.sockets, arguments);
    };
});

module.exports = (srv?, opts?) => new Server(srv, opts);
module.exports.Server = Server;
module.exports.Namespace = Namespace;
module.exports.Socket = Socket;

export {
    Socket,
    DisconnectReason,
    ServerOptions,
    Namespace,
    BroadcastOperator,
    RemoteSocket,
};
