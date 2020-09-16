package main

import (
	"dev-controller/kubeutil"
	"flag"
	"github.com/asaskevich/EventBus"
	"github.com/gin-gonic/gin"
	"github.com/vearne/gin-timeout"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/tools/clientcmd"
	_ "log"
	_ "net"
	"sync"
	"time"
)

type Context struct {
	*gin.Context
}

var waitgroupStore map[string] sync.WaitGroup

type HandlerFunc func(*Context)

func handler(handler HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		context := new(Context)
		context.Context = c
		handler(context)
	}
}

func main() {

	watchStates := map[string]*kubeutil.WatchState{}

	instance := createKubeInstance()

	go instance.Watch(watchStates)
	r := gin.Default()
	r.Use(timeout.Timeout(time.Second * 60 * 5))
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	r.POST("/pod/nodejs/:id", func(c *gin.Context) {
		id := c.Param("id")

		if id == "" {
			c.JSON(200, gin.H{
				"message": "not found param id",
			})
		}else {


			if err := instance.Create(id); err != nil {
				c.JSON(200, gin.H{
					"message": ".Create " + id + "fail," + err.Error(),
				})
				delete(watchStates,id)
				return
			}
			var waitgroup sync.WaitGroup
			watchStates[id] = &kubeutil.WatchState{WaitDone:false,WaitAble:false,WaiteGroup:&waitgroup}


			waitgroup.Add(1)
			waitgroup.Wait()

			delete(watchStates,id)


			c.JSON(200, gin.H{
				"message": ".Create " + id + "success",
			})


		}
	})
	r.DELETE("/pod/nodejs/:id", handler(func(c *Context) {
		id := c.Param("id")

		if id == "" {
			c.JSON(200, gin.H{
				"message": "not found param id",
			})
		}else {

			if err := instance.Delete(id); err != nil {
				c.JSON(200, gin.H{
					"message": err.Error(),
				})
				panic(err)
			}
			var waitgroup sync.WaitGroup
			watchStates[id] = &kubeutil.WatchState{WaitDone:false,WaitAble:false,WaiteGroup:&waitgroup}


			watchStates[id].WaiteGroup.Add(1)
			watchStates[id].WaiteGroup.Wait()
			delete(watchStates,id)
			c.JSON(200, gin.H{
				"message": "not found param id",
			})

		}


	}))

	_ = r.Run(":8080") // listen and serve on 0.0.0.0:8080


}
func createKubeInstance() *kubeutil.KubeInstance {
	var kubeconfig string
	var master string
	bus := EventBus.New();
	flag.StringVar(&kubeconfig, "k8sconfig", "kubeconfig", "kubernetes config file path")
	flag.StringVar(&master, "master", "", "https://39.101.166.92:6443")
	flag.Parse()

	config, err := clientcmd.BuildConfigFromFlags(master, kubeconfig)
	if err != nil {
		panic(err)
	}

	client, err := dynamic.NewForConfig(config)
	if err != nil {
		panic(err)
	}
	// 获取指定 namespace 中的 Pod 列表信息
	namespace := "dev-server"

	deploymentRes := schema.GroupVersionResource{Group: "apps", Version: "v1", Resource: "deployments"}
	instance := &kubeutil.KubeInstance{Namespace: namespace, Client: client, DeploymentRes: deploymentRes, Event:bus}
	return instance
}
