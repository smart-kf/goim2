package main

import (
	"encoding/json"
	"fmt"
	"github.com/smart-kf/goim2/pkg/bufio"
	"github.com/smart-kf/goim2/pkg/websocket"
	"net"
)

func main() {
	ln, err := net.Listen("tcp", ":8999")
	if err != nil {
		return
	}

	acceptWebsocket(ln.(*net.TCPListener))
}

func acceptWebsocket(lis *net.TCPListener) {
	var (
		conn *net.TCPConn
		err  error
	)
	for {
		if conn, err = lis.AcceptTCP(); err != nil {
			// if listener close then return
			return
		}
		go serveWebsocket(conn)
	}
}

func serveWebsocket(conn *net.TCPConn) {
	ip, _, _ := net.SplitHostPort(conn.RemoteAddr().String())
	fmt.Println(ip)

	var rr = bufio.Reader{}
	var buf = make([]byte, 1024)
	rr.ResetBuffer(conn, buf)

	if req, err := websocket.ReadRequest(&rr); err != nil {

		fmt.Println(err)
	} else {
		res, _ := json.Marshal(req)
		fmt.Println(string(res))
	}
}
