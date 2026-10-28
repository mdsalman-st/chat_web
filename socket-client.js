/**
 * Socket Client disabled as per request.
 * Safe stub to prevent errors in existing HTML files.
 */
(function(window) {
  'use strict';
  window.SocketClient = {
    connect: function() { return Promise.resolve(null); },
    disconnect: function() {},
    on: function() {},
    emit: function() {},
  };
})(window);