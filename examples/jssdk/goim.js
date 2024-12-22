(function(win) {
    const rawHeaderLen = 16;
    const packetOffset = 0;
    const headerOffset = 4;
    const verOffset = 6;
    const opOffset = 8;
    const seqOffset = 12;

    // const token = onAuth();
    // onAuthSuccess()
    // onMessage(msgJsonObject)
    // onClose()

    var Client = function(endpoint,options) {
        var MAX_CONNECT_TIMES = 10;
        var DELAY = 15000;
        this.options = options || {};
        this.endpoint = endpoint;
        this.createConnect(MAX_CONNECT_TIMES, DELAY);
    }

    Client.prototype.createConnect = function(max, delay) {
        var self = this;
        if (max === 0) {
            return;
        }
        connect();

        var textDecoder = new TextDecoder();
        var textEncoder = new TextEncoder();
        var heartbeatInterval;
        function connect() {
            var ws = new WebSocket(self.endpoint);
            ws.binaryType = 'arraybuffer';
            ws.onopen = function() {
                token = self.options.onAuth()
                auth(token);
            }

            ws.onmessage = function(evt) {
                var data = evt.data;
                var dataView = new DataView(data, 0);
                var packetLen = dataView.getInt32(packetOffset);
                var headerLen = dataView.getInt16(headerOffset);
                var ver = dataView.getInt16(verOffset);
                var op = dataView.getInt32(opOffset);
                var seq = dataView.getInt32(seqOffset);
                if(self.options.debug) {
                    console.log("receiveHeader: packetLen=" + packetLen, "headerLen=" + headerLen, "ver=" + ver, "op=" + op, "seq=" + seq);
                }
                switch(op) {
                    case 8:
                        options.onAuthSuccess && options.onAuthSuccess();
                        if(self.options.debug) {
                            console.log("server->client: auth success")
                        }
                        // send a heartbeat to server
                        heartbeat();
                        heartbeatInterval = setInterval(heartbeat, 30 * 1000);
                        break;
                    case 3:
                        if(self.options.debug) {
                            console.log("server->client: heartbeat")
                        }
                        break;
                    case 9:
                        // batch message
                        for (var offset=rawHeaderLen; offset<data.byteLength; offset+=packetLen) {
                            // parse
                            var packetLen = dataView.getInt32(offset);
                            var headerLen = dataView.getInt16(offset+headerOffset);
                            var ver = dataView.getInt16(offset+verOffset);
                            var op = dataView.getInt32(offset+opOffset);
                            var seq = dataView.getInt32(offset+seqOffset);
                            var msgBody = textDecoder.decode(data.slice(offset+headerLen, offset+packetLen));
                            // callback
                            let jsonMessage = JSON.parse(msgBody)
                            if(self.options.debug ) {
                                console.log("server->client: batchMessage: ", jsonMessage)
                            }
                            if(self.options.onMessage) {
                                let jsonMessage = JSON.parse(msgBody)
                                self.options.onMessage(jsonMessage)
                            }
                        }
                        break;
                    default:
                        var msgBody = textDecoder.decode(data.slice(headerLen, packetLen));
                        let jsonMessage = JSON.parse(msgBody)
                        if(self.options.debug ) {
                            console.log("server->client: ", jsonMessage)
                        }
                        if(self.options.onMessage) {
                            self.options.onMessage(jsonMessage)
                        }
                        break
                }
            }

            ws.onclose = function() {
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                setTimeout(reConnect, delay);
                if(self.options.onClose) {
                    self.options.onClose()
                }
                if(self.options.debug) {
                    console.log("websocket closed");
                }
            }

            function heartbeat() {
                var headerBuf = new ArrayBuffer(rawHeaderLen);
                var headerView = new DataView(headerBuf, 0);
                headerView.setInt32(packetOffset, rawHeaderLen);
                headerView.setInt16(headerOffset, rawHeaderLen);
                headerView.setInt16(verOffset, 1);
                headerView.setInt32(opOffset, 2);
                headerView.setInt32(seqOffset, 1);
                ws.send(headerBuf);
                if(self.options.debug) {
                    console.log("client->server: heartbeat");
                }
            }

            function auth() {
                var token = '{"mid":123, "room_id":"live://1000", "platform":"web", "accepts":[1000,1001,1002]}'
                var headerBuf = new ArrayBuffer(rawHeaderLen);
                var headerView = new DataView(headerBuf, 0);
                var bodyBuf = textEncoder.encode(token);
                headerView.setInt32(packetOffset, rawHeaderLen + bodyBuf.byteLength);
                headerView.setInt16(headerOffset, rawHeaderLen);
                headerView.setInt16(verOffset, 1);
                headerView.setInt32(opOffset, 7);
                headerView.setInt32(seqOffset, 1);
                ws.send(mergeArrayBuffer(headerBuf, bodyBuf));
            }

            function mergeArrayBuffer(ab1, ab2) {
                var u81 = new Uint8Array(ab1),
                    u82 = new Uint8Array(ab2),
                    res = new Uint8Array(ab1.byteLength + ab2.byteLength);
                res.set(u81, 0);
                res.set(u82, ab1.byteLength);
                return res.buffer;
            }

            function char2ab(str) {
                var buf = new ArrayBuffer(str.length);
                var bufView = new Uint8Array(buf);
                for (var i=0; i<str.length; i++) {
                    bufView[i] = str[i];
                }
                return buf;
            }

        }
        function reConnect() {
            self.createConnect(--max, delay * 2);
        }
    }


    win['MyClient'] = Client;
})(window);
