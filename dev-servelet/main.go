package main

import (
	"github.com/gin-gonic/gin"
	"github.com/vearne/gin-timeout"
	"main/ws"
	"time"
)

func main() {
	go ws.WebsocketManager.Start()
	go ws.WebsocketManager.SendService()
	go ws.WebsocketManager.SendService()
	go ws.WebsocketManager.SendGroupService()
	go ws.WebsocketManager.SendGroupService()
	go ws.WebsocketManager.SendAllService()
	go ws.WebsocketManager.SendAllService()





	router := gin.Default()
	router.Use(timeout.Timeout(time.Second * 60 * 5))
	router.GET("/send", func(c *gin.Context) {
		ws.WebsocketManager.SendGroup("test", []byte("SendGroup message ----"+time.Now().Format("2006-01-02 15:04:05")))
		c.JSON(200, gin.H{
			"message": "sendTest",
		})
	})
	wsGroup := router.Group("/ws")
	{
		wsGroup.GET("/:channel", ws.WebsocketManager.WsClient)
	}



	_ = router.Run(":7777")
}

