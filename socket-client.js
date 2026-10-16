/**
 * ============================================================================
 * SOCKET-CLIENT.JS — Real-Time Chat Client for Nexus Frontend
 * ============================================================================
 * Socket.io ka wrapper. Vault isko use karega real-time messaging ke liye.
 * ============================================================================
 */

(function (window) {
  'use strict';

  const SOCKET_URL = 'http://localhost:5000';
  let socket = null;
  let currentRoomId = null;

  /* --------------------------------------------------------------------------
     LOAD SOCKET.IO LIBRARY DYNAMICALLY
     -------------------------------------------------------------------------- */
  function loadSocketIO() {
    return new Promise((resolve, reject) => {
      if (window.io) return resolve(window.io);

      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = () => resolve(window.io);
      script.onerror = () => reject(new Error('Failed to load Socket.io'));
      document.head.appendChild(script);
    });
  }

  /* --------------------------------------------------------------------------
     CONNECT — returns socket AND waits for actual connection
     -------------------------------------------------------------------------- */
  async function connect() {
    if (socket && socket.connected) return socket;

    const token = window.API?.Token?.get();
    if (!token) {
      console.warn('⚠️ Socket: No token — cannot connect');
      return null;
    }

    await loadSocketIO();

    // Disconnect old socket if any
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    socket = window.io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    // Wait for actual connection (max 5s)
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };

      if (socket.connected) return finish();

      socket.once('connect', finish);
      socket.once('connect_error', finish);
      setTimeout(finish, 5000);
    });

    // Bind persistent listeners (idempotent — safe to re-add)
    socket.on('connect', () => {
      console.log('%c🔌 Socket connected', 'color:#22d3ee;font-weight:bold', socket.id);
      if (currentRoomId) {
        socket.emit('room:join', { roomId: currentRoomId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    return socket;
  }

  /* --------------------------------------------------------------------------
     DISCONNECT
     -------------------------------------------------------------------------- */
  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      currentRoomId = null;
      console.log('🔌 Socket manually disconnected');
    }
  }

  /* --------------------------------------------------------------------------
     ROOM: JOIN / LEAVE
     -------------------------------------------------------------------------- */
  function joinRoom(roomId) {
    if (!socket || !socket.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }
    currentRoomId = roomId;
    return new Promise((resolve, reject) => {
      socket.emit('room:join', { roomId }, (res) => {
        if (res?.error) return reject(new Error(res.error));
        resolve(res);
      });
    });
  }

  function leaveRoom(roomId) {
    if (!socket) return;
    socket.emit('room:leave', { roomId });
    if (currentRoomId === roomId) currentRoomId = null;
  }

  /* --------------------------------------------------------------------------
     MESSAGE: SEND
     -------------------------------------------------------------------------- */
  function sendMessage(roomId, text) {
    if (!socket || !socket.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }
    return new Promise((resolve, reject) => {
      socket.emit('message:send', { roomId, text }, (res) => {
        if (res?.error) return reject(new Error(res.error));
        resolve(res);
      });
    });
  }

  /* --------------------------------------------------------------------------
     TYPING INDICATORS
     -------------------------------------------------------------------------- */
  function startTyping(roomId) {
    if (socket && socket.connected) socket.emit('typing:start', { roomId });
  }

  function stopTyping(roomId) {
    if (socket && socket.connected) socket.emit('typing:stop', { roomId });
  }

  /* --------------------------------------------------------------------------
     EVENT LISTENERS
     -------------------------------------------------------------------------- */
  const handlers = {
    newMessage: [],
    typingStart: [],
    typingStop: [],
  };

  function on(event, cb) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(cb);
  }

  function off(event, cb) {
    if (!handlers[event]) return;
    handlers[event] = handlers[event].filter((fn) => fn !== cb);
  }

  function emitToHandlers(event, data) {
    (handlers[event] || []).forEach((fn) => {
      try { fn(data); } catch (e) { console.error('Handler error:', e); }
    });
  }

  /* --------------------------------------------------------------------------
     BIND SOCKET EVENTS (idempotent — call multiple times is safe)
     -------------------------------------------------------------------------- */
  let eventsBound = false;

  function bindSocketEvents() {
    if (!socket || eventsBound) return;
    eventsBound = true;

    socket.on('message:new', (msg) => {
      emitToHandlers('newMessage', msg);
    });

    socket.on('typing:start', (data) => {
      emitToHandlers('typingStart', data);
    });

    socket.on('typing:stop', (data) => {
      emitToHandlers('typingStop', data);
    });
  }

  /* --------------------------------------------------------------------------
     INIT — connect + bind
     -------------------------------------------------------------------------- */
  async function init() {
    const s = await connect();
    if (s && s.connected) bindSocketEvents();
    return s;
  }

  /* --------------------------------------------------------------------------
     EXPORT
     -------------------------------------------------------------------------- */
  window.SocketClient = {
    init,
    connect,
    disconnect,
    isConnected: () => !!socket && socket.connected,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    on,
    off,
    getSocket: () => socket,
    getId: () => socket?.id || null,
  };

  console.log('%c🔌 SocketClient ready', 'color:#22d3ee;font-weight:bold');

})(window);