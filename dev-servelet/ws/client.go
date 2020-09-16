package ws

import (
	"context"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	uuid "github.com/satori/go.uuid"
	"io"
	"log"
	"net/http"
	"os/exec"
	"regexp"
	"strings"
	"sync"
)

// Manager 所有 websocket 信息
type Manager struct {
	Group                   map[string]map[string]*Client
	groupCount, clientCount uint
	Lock                    sync.Mutex
	Register, UnRegister    chan *Client
	Message                 chan *MessageData
	GroupMessage            chan *GroupMessageData
	BroadCastMessage        chan *BroadCastMessageData
}

// Client 单个 websocket 信息
type Client struct {
	Id, Group string
	Socket    *websocket.Conn
	Message   chan []byte
}

// messageData 单个发送数据信息
type MessageData struct {
	Id, Group string
	Message   []byte
}

// groupMessageData 组广播数据信息
type GroupMessageData struct {
	Group   string
	Message []byte
}

// 广播发送数据信息
type BroadCastMessageData struct {
	Message []byte
}





// 读信息，从 websocket 连接直接读取数据
func (c *Client) Read() {
	defer func() {
		WebsocketManager.UnRegister <- c
		log.Printf("client [%s] disconnect", c.Id)
		if err := c.Socket.Close(); err != nil {
			log.Printf("client [%s] disconnect err: %s", c.Id, err)
		}
	}()

	for {
		messageType, message, err := c.Socket.ReadMessage()
		if err != nil || messageType == websocket.CloseMessage {
			break
		}
		log.Printf("client [%s] receive message: %s", c.Id, string(message))

		if c.Group == "webshell"{
			handleWebShell(c,message)
		}
		//if c.Group == "system"{
		//	handleSystem(c,message)
		//}
	}
}


func SyncLog(CmdStdoutPiper io.ReadCloser,cmd *exec.Cmd) {
	buf := make([]byte, 1024, 1024)
	for {
		select {
		case <-Ctx.Done():
			return
		default:
			strNum, err := CmdStdoutPiper.Read(buf)
			if strNum > 0 {
				outputByte := buf[:strNum]
				str := string(outputByte)
				println(str)
				WebsocketManager.SendGroup("webshell", outputByte)
				if cmd!= nil && cmd.ProcessState != nil && cmd.ProcessState.Success() {
					println("成功=================================")
				}else{
					println("失败=================================")
				}
			}
			if err != nil {
				//读到结尾
				if err == io.EOF || strings.Contains(err.Error(), "file already closed") {
					err = nil
				}
			}
		}
	}
}

// 写信息，从 channel 变量 Send 中读取数据写入 websocket 连接
func (c *Client) Write() {
	defer func() {
		log.Printf("client [%s] disconnect", c.Id)
		if err := c.Socket.Close(); err != nil {
			log.Printf("client [%s] disconnect err: %s", c.Id, err)
		}
	}()

	for {
		select {
		case message, ok := <-c.Message:
			if !ok {
				_ = c.Socket.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			log.Printf("client [%s] write message: %s", c.Id, string(message))
			err := c.Socket.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				log.Printf("client [%s] writemessage err: %s", c.Id, err)
			}
		}
	}
}

// 启动 websocket 管理器
func (manager *Manager) Start() {
	log.Printf("websocket manage start")
	// 正常退出杀掉进程组

	for {
		select {
		// 注册
		case client := <-manager.Register:
			log.Printf("client [%s] connect", client.Id)
			log.Printf("register client [%s] to group [%s]", client.Id, client.Group)

			manager.Lock.Lock()
			if manager.Group[client.Group] == nil {
				manager.Group[client.Group] = make(map[string]*Client)
				manager.groupCount += 1
			}
			manager.Group[client.Group][client.Id] = client
			manager.clientCount += 1
			manager.Lock.Unlock()

			// 注销
		case client := <-manager.UnRegister:
			log.Printf("unregister client [%s] from group [%s]", client.Id, client.Group)
			manager.Lock.Lock()
			if _, ok := manager.Group[client.Group]; ok {
				if _, ok := manager.Group[client.Group][client.Id]; ok {
					close(client.Message)
					delete(manager.Group[client.Group], client.Id)
					manager.clientCount -= 1
					if len(manager.Group[client.Group]) == 0 {
						//log.Printf("delete empty group [%s]", client.Group)
						delete(manager.Group, client.Group)
						manager.groupCount -= 1
					}
				}
			}
			manager.Lock.Unlock()

			//发送广播数据到某个组的 channel 变量 Send 中
			//case data := <-manager.GroupMessage:
			//	if groupMap, ok := manager.Group[data.Group]; ok {
			//		for _, conn := range groupMap {
			//			manager.Message <- data.Message
			//		}
			//	}
		}
	}


}

// 处理单个 client 发送数据
func (manager *Manager) SendService() {
	for {
		select {
		case data := <-manager.Message:
			if groupMap, ok := manager.Group[data.Group]; ok {
				if conn, ok := groupMap[data.Id]; ok {
					conn.Message <- data.Message
				}
			}
		}
	}
}

// 处理 group 广播数据
func (manager *Manager) SendGroupService() {
	for {
		select {
		// 发送广播数据到某个组的 channel 变量 Send 中
		case data := <-manager.GroupMessage:
			if groupMap, ok := manager.Group[data.Group]; ok {
				for _, conn := range groupMap {
					conn.Message <- data.Message
				}
			}
		}
	}
}

// 处理广播数据
func (manager *Manager) SendAllService() {
	for {
		select {
		case data := <-manager.BroadCastMessage:
			for _, v := range manager.Group {
				for _, conn := range v {
					conn.Message <- data.Message
				}
			}
		}
	}
}

// 向指定的 client 发送数据
func (manager *Manager) Send(id string, group string, message []byte) {
	data := &MessageData{
		Id:      id,
		Group:   group,
		Message: message,
	}
	manager.Message <- data
}

// 向指定的 Group 广播
func (manager *Manager) SendGroup(group string, message []byte) {
	data := &GroupMessageData{
		Group:   group,
		Message: message,
	}
	manager.GroupMessage <- data
}

// 广播
func (manager *Manager) SendAll(message []byte) {
	data := &BroadCastMessageData{
		Message: message,
	}
	manager.BroadCastMessage <- data
}

// 注册
func (manager *Manager) RegisterClient(client *Client) {
	manager.Register <- client
}

// 注销
func (manager *Manager) UnRegisterClient(client *Client) {
	manager.UnRegister <- client
}

// 当前组个数
func (manager *Manager) LenGroup() uint {
	return manager.groupCount
}

// 当前连接个数
func (manager *Manager) LenClient() uint {
	return manager.clientCount
}

// 获取 wsManager 管理器信息
func (manager *Manager) Info() map[string]interface{} {
	managerInfo := make(map[string]interface{})
	managerInfo["groupLen"] = manager.LenGroup()
	managerInfo["clientLen"] = manager.LenClient()
	managerInfo["chanRegisterLen"] = len(manager.Register)
	managerInfo["chanUnregisterLen"] = len(manager.UnRegister)
	managerInfo["chanMessageLen"] = len(manager.Message)
	managerInfo["chanGroupMessageLen"] = len(manager.GroupMessage)
	managerInfo["chanBroadCastMessageLen"] = len(manager.BroadCastMessage)
	return managerInfo
}

// 初始化 wsManager 管理器
var WebsocketManager = Manager{
	Group:            make(map[string]map[string]*Client),
	Register:         make(chan *Client, 128),
	UnRegister:       make(chan *Client, 128),
	GroupMessage:     make(chan *GroupMessageData, 128),
	Message:          make(chan *MessageData, 128),
	BroadCastMessage: make(chan *BroadCastMessageData, 128),
	groupCount:       0,
	clientCount:      0,
}

// gin 处理 websocket handler
func (manager *Manager) WsClient(ctx *gin.Context) {
	upGrader := websocket.Upgrader{
		// cross origin domain
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
		// 处理 Sec-WebSocket-Protocol Header
		Subprotocols: []string{ctx.GetHeader("Sec-WebSocket-Protocol")},
	}

	conn, err := upGrader.Upgrade(ctx.Writer, ctx.Request, nil)
	if err != nil {
		log.Printf("websocket connect error: %s", ctx.Param("channel"))
		return
	}

	client := &Client{
		Id:      uuid.NewV4().String(),
		Group:   ctx.Param("channel"),
		Socket:  conn,
		Message: make(chan []byte, 1024),
	}

	manager.RegisterClient(client)
	go client.Read()
	go client.Write()
}


var Cmd *exec.Cmd
var Ctx context.Context
var CancelFunc context.CancelFunc
var _ io.ReadCloser
var CmdStdoutPipe io.ReadCloser
var CmdStderrPipe io.ReadCloser
func exec_shell(cmdStr string){
	//4、正则替换
	//通过函数进行替换
	re3 := regexp.MustCompile(`[\S]+`)

	cmdSilce := re3.FindAllString(cmdStr, -1)
	cmdSilce = append(cmdSilce, "--color=always")




	cmdName := cmdSilce[0];
	args := cmdSilce[1:len(cmdSilce)-1:len(cmdSilce)-1]

	if strings.ToLower(cmdName) == "ctrl" && strings.ToLower(args[0]) == "c"{

		if  Cmd != nil && Cmd.Process != nil && Cmd.ProcessState != nil{
			Cmd = exec.CommandContext(Ctx,"kill","-2", string(Cmd.ProcessState.Pid()))
			err := Cmd.Start()
			if err != nil {
				fmt.Println(err)
			}
			//err := Cmd.Start()
			//if err != nil {
			//	fmt.Println(err)
			//}
		}

	}else {
		Ctx, CancelFunc = context.WithCancel(context.Background())
		if  Cmd != nil && Cmd.Process != nil && Cmd.ProcessState != nil{

			Cmd = exec.CommandContext(Ctx,"kill","-2", string(Cmd.ProcessState.Pid()))
			err := Cmd.Start()
			if err != nil {
				fmt.Println(err)
			}
		}

		Cmd = exec.CommandContext(Ctx,cmdName,args...)

		Cmd.Dir = "/tmp/dev/temp"
		CmdStdoutPipe, _ = Cmd.StdoutPipe()
		CmdStderrPipe, _ = Cmd.StderrPipe()



		go SyncLog(CmdStdoutPipe,Cmd)

		go SyncLog(CmdStderrPipe,Cmd)

		err := Cmd.Start()
		if err != nil {
			fmt.Println(err)
		}

	}



}



func handleWebShell(c *Client, message []byte)  {
	println(message)
	exec_shell(string(message))

}
func handleSystem(c *Client, message []byte)  {

}

func printlnSlice(rep2 []interface{}) {
	for i := 0; i < len(rep2); i++ {
		fmt.Printf("slice[%v]=%v ", i,rep2[i])

	}
}
