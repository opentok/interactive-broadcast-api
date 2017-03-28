/* eslint-env es6 */
import config from '../../config/config';

const { eventStatuses } = require('./dbProperties');
const presence = require('./presence');
const broadcast = require('./broadcast');
const _ = require('underscore');

/** Internal methods*/
const sessionsToUpdate = new Map();

/**
 * Returns an object containing all the active rooms and the associated connections
 * @returns {Object} {id: Room { sockets: {socketId: true, socketId: true}}}
 */
const getAllRooms = io => io.sockets.adapter.rooms;

/**
 * Is the room associated with a session or broadcast? Rooms associated
 * with users begin with '/#'
 */
const sessionOrBroadcastSocket = id => !id.startsWith('/#');

/**
 * Returns the connection type based on the identifier
 * @param {String} id - The host session id or broadcast id prepended with 'broadcast'
 * @returns {String} - 'interactive' or 'broadcast'
 */
const connectionType = id => (id.startsWith('broadcast') ? 'broadcast' : 'interactive');

/**
 * Builds a map of active interactive and broadcast connections
 * @param {Object} rooms - Socket.io rooms
 * @returns {Map} {id => {id, type, connections}}
 */
const getActiveConnections = (rooms) => {
  const connections = new Map();

  if (!rooms) return connections;

  const buildConnection = (acc, id) => {
    if (sessionOrBroadcastSocket(id)) {
      const connection = {};
      connection.id = id;
      connection.type = connectionType(id);
      connection.connections = rooms[id].length;
      acc.set(id, connection);
    }
    return acc;
  };

  return Object.keys(rooms).reduce(buildConnection, connections);
};

/**
* Provides current connection data to the broadcast service
* @param {Map} - connections
*/
const updateBroadcast = connections => presence.updateConnections(connections);

/**
 * Update the users count to the producers.
 * @param {io} - socket connection
 */
const updateUsersCount = async (io) => {
  const activeConnections = presence.getActiveConnections();
  activeConnections.forEach((connections, room) => {
    const users = `${connections} / ${config.interactiveStreamLimit}`;
    io.to(`${room}-producer`).emit('updateInteractiveUsers', users);
  });
  return true;
};

/**
 * When a socket.io connection is automatically closed (e.g. user closes browser window), a 'disconnect' event will
 * be emitted, but we won't know which room(s) the user left. In order to update the number of active connections
 * in the broadcast service, get the number of active connections to each socket.io room and provide those counts.
 * We're currently limiting this action to once every 500 ms.
 */
const updateBroadcastSessions = _.debounce(_.compose(updateBroadcast, getActiveConnections, getAllRooms), 500, true);

/** Exports */

/**
 * Start listening for connections
 * @param {Object} httpServer
 * @returns {Object} io
 */
const initWebsocketServer = (httpServer) => {
  const io = require('socket.io')(httpServer); // eslint-disable-line global-require

  io.on('connection', (socket) => {
    socket.emit('serverConnected');

    // Original signals
    socket.on('joinRoom', room => socket.join(room));
    socket.on('mySnapshot', data => io.to(data.sessionId).emit('userSnapshot', data));
    socket.on('newProducer', data => io.emit('newProducer', data));
    socket.on('blockProducer', data => io.emit('blockProducer', data));

    socket.on('changeStatus', data =>
      (data.newStatus === eventStatuses.PRESHOW ? socket.emit('changeStatusSuccess', data) : io.emit('changeStatus', data))
    );

    // Presence and broadcast
    socket.on('joinInteractive', async (room) => {
      const emitAbleToJoin = (ableToJoin, broadcastData) => {
        socket.emit('ableToJoin', {
          ableToJoin,
          broadcastData
        });
      };

      const ableToJoin = presence.ableToJoinInteractiveBySession(room);
      const { hls } = await presence.getInteractiveSessionData(room);
      if (hls && !ableToJoin) {
        try {
          const { broadcastUrl, broadcastId, eventLive } = await broadcast.getBroadcastData({ sessionId: room });
          emitAbleToJoin(ableToJoin, { broadcastUrl, broadcastId, eventLive });
        } catch (error) {
          emitAbleToJoin(false, null);
        }
      } else {
        emitAbleToJoin(ableToJoin, null);
      }

      if (ableToJoin) {
        socket.join(room);
        updateBroadcastSessions(io);
        updateUsersCount(io);
      }
    });

    socket.on('producerJoinRoom', (data) => {
      socket.join(`${data.sessionId}-producer`);
      presence.setSessionData(data);
      updateUsersCount(io);
      if (sessionsToUpdate.has(data.sessionId)) {
        io.emit('changeStatus', sessionsToUpdate.get(data.sessionId));
        sessionsToUpdate.delete(data.sessionId);
      }
    });

    socket.on('joinBroadcast', (room) => {
      socket.join(room);
      updateBroadcastSessions(io);
    });

    // Event with HLS on ended
    socket.on('eventEnded', async (data) => {
      if (data.broadcastEnabled) {
        const broadcastData = await broadcast.getBroadcastData({ sessionId: data.broadcastSession });
        const room = `broadcast${broadcastData.broadcastId}`;
        io.to(room).emit('eventEnded');

        // end broadcast here
        broadcast.endBroadcast(broadcastData.broadcastId, data.broadcastSession);
        presence.removeBroadcastLocalStorage(data.broadcastSession);
      }
      presence.removeLocalStorage(data.broadcastSession);
    });


    socket.on('eventGoLive', async (broadcastSession) => {
      const broadcastData = broadcast.getBroadcastData({ sessionId: broadcastSession });
      broadcast.eventGoLive(broadcastSession);
      const room = `broadcast${broadcastData.broadcastId}`;
      io.to(room).emit('eventGoLive');
    });

    socket.on('requestBroadcastURL', async (broadcastSession) => {
      const broadcastData = broadcast.getBroadcastData({ sessionId: broadcastSession });
      socket.emit('broadcastURL', broadcastData.broadcastUrl);
    });

    socket.on('disconnect', () => {
      updateBroadcastSessions(io);
      updateUsersCount(io);
    });

    return io;
  });
};

module.exports = initWebsocketServer;
