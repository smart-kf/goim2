package logic

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	log "github.com/golang/glog"
	"github.com/google/uuid"
	"github.com/smart-kf/goim2/api/protocol"
	"github.com/smart-kf/goim2/services/logic/model"
)

// Connect connected a conn.
func (l *Logic) Connect(c context.Context, server, query string, wsToken []byte) (mid int64, key, roomID string, accepts []int32, hb int64, err error) {
	if err = l.onAuth(c, query); err != nil {
		log.Errorf("auth failed:token:%+v err=%+v", query, err)
		return
	}
	var params struct {
		Mid      int64   `json:"mid"`
		Key      string  `json:"key"`
		RoomID   string  `json:"room_id"`
		Platform string  `json:"platform"`
		Accepts  []int32 `json:"accepts"`
	}
	if err = json.Unmarshal(wsToken, &params); err != nil {
		log.Errorf("json.Unmarshal(%s) error(%v)", wsToken, err)
		return
	}
	mid = params.Mid
	roomID = params.RoomID
	accepts = params.Accepts
	hb = int64(l.c.Node.Heartbeat) * int64(l.c.Node.HeartbeatMax)
	if key = params.Key; key == "" {
		key = uuid.New().String()
	}
	if err = l.dao.AddMapping(c, mid, key, server); err != nil {
		log.Errorf("l.dao.AddMapping(%d,%s,%s) error(%v)", mid, key, server, err)
	}
	log.Infof("conn connected key:%s server:%s mid:%d token:%s", key, server, mid, wsToken)
	return
}

// Disconnect disconnect a conn.
func (l *Logic) Disconnect(c context.Context, mid int64, key, server string) (has bool, err error) {
	if has, err = l.dao.DelMapping(c, mid, key, server); err != nil {
		log.Errorf("l.dao.DelMapping(%d,%s) error(%v)", mid, key, server)
		return
	}
	log.Infof("conn disconnected key:%s server:%s mid:%d", key, server, mid)
	return
}

// Heartbeat heartbeat a conn.
func (l *Logic) Heartbeat(c context.Context, mid int64, key, server string) (err error) {
	has, err := l.dao.ExpireMapping(c, mid, key)
	if err != nil {
		log.Errorf("l.dao.ExpireMapping(%d,%s,%s) error(%v)", mid, key, server, err)
		return
	}
	if !has {
		if err = l.dao.AddMapping(c, mid, key, server); err != nil {
			log.Errorf("l.dao.AddMapping(%d,%s,%s) error(%v)", mid, key, server, err)
			return
		}
	}
	log.Infof("conn heartbeat key:%s server:%s mid:%d", key, server, mid)
	return
}

// RenewOnline renew a server online.
func (l *Logic) RenewOnline(c context.Context, server string, roomCount map[string]int32) (map[string]int32, error) {
	online := &model.Online{
		Server:    server,
		RoomCount: roomCount,
		Updated:   time.Now().Unix(),
	}
	if err := l.dao.AddServerOnline(context.Background(), server, online); err != nil {
		return nil, err
	}
	return l.roomCount, nil
}

// Receive receive a message.
func (l *Logic) Receive(c context.Context, mid int64, proto *protocol.Proto) (err error) {
	log.Infof("receive mid:%d message:%+v", mid, proto)
	return
}

func (l *Logic) onAuth(ctx context.Context, query string) error {
	if !l.c.Auth.Enable {
		return nil
	}
	req, err := http.NewRequest(http.MethodPost, l.c.Auth.AuthUrl, strings.NewReader(query))
	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	req = req.WithContext(ctx)
	resp, err := l.authHttpClent.Do(req)
	if err != nil {
		log.Infof("websocket onAuth hoook failed: %+v", err)
		return err
	}
	if resp.StatusCode != l.c.Auth.AuthOkCode {
		log.Infof("websocket onAuth hook status not equal except=%v get=%v", l.c.Auth.AuthOkCode, resp.StatusCode)
		return errors.New("auth failed")
	}
	log.Infof("websocket onAuth ok")
	return nil
}
