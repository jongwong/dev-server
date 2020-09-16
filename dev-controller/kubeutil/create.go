package kubeutil

import (
	"fmt"
	"github.com/asaskevich/EventBus"
	"golang.org/x/net/context"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"sync"
)

type KubeInstance struct {
	Id            string
	Namespace     string
	Client        dynamic.Interface
	DeploymentRes schema.GroupVersionResource
	Event         EventBus.Bus
}

func (instance KubeInstance) Create(id string) error{
	deployment := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps/v1",
			"kind":       "Deployment",
			"metadata": map[string]interface{}{
				"name": id,
				"labels": map[string]interface{}{
					"app": id,
				},
			},
			"spec": map[string]interface{}{
				"replicas": 1,
				"selector": map[string]interface{}{
					"matchLabels": map[string]interface{}{
						"app": id,
					},
				},
				"template": map[string]interface{}{
					"metadata": map[string]interface{}{
						"labels": map[string]interface{}{
							"app": id,
						},
					},
					"spec": map[string]interface{}{
						"containers": []map[string]interface{}{
							{
								"name":            id,
								"image":           "registry.jongwong.cn/node:alpine3.11",
								"imagePullPolicy": "IfNotPresent",
								"command":         []string{"/bin/sh", "-c", "--"},
								"args":            []string{"while true; do sleep 30; done;"},
								"ports": []map[string]interface{}{
									{
										"name":          "http",
										"protocol":      "TCP",
										"containerPort": 80,
									},
								},
								"volumeMounts": []map[string]interface{}{
									{
										"name":      "volumes",
										"mountPath": "/data/nodejs",
									},
									{
										"name":      "data",
										"mountPath": "/root/dev-server",
									},
								},
							},
						},
						"volumes": []map[string]interface{}{
							{
								"name": "volumes",
								"emptyDir": map[string]interface{}{
									"medium": "Memory",
								},
							},
							{
								"name": "data",
								"hostPath": map[string]interface{}{
									"path": "/root/dev-server",
								},
							},
						},
					},
				},
			},
		},
	}
	// Create Deployment
	fmt.Println("Creating deployment...")
	_, err := instance.Client.Resource(instance.DeploymentRes).Namespace(instance.Namespace).Create(context.TODO(), deployment, metav1.CreateOptions{})
	if err != nil {
		return  err

	}
	return nil
}
type WatchState struct {
	WaitDone bool
	WaitAble bool
	WaiteGroup *sync.WaitGroup
}
func (instance KubeInstance) Delete(id string) error {
	fmt.Println("Deleting deployment...")
	deletePolicy := metav1.DeletePropagationForeground
	deleteOptions := metav1.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	}
	if err := instance.Client.Resource(instance.DeploymentRes).Namespace(instance.Namespace).Delete(context.TODO(), id, deleteOptions); err != nil {
		return err
	}
	return nil
}

func (instance KubeInstance) Watch(watchStates map[string] *WatchState ) {
	client := instance.Client;
	deploymentRes := instance.DeploymentRes;
	namespace := instance.Namespace;

	watcher, err := client.Resource(deploymentRes).Namespace(namespace).Watch(context.TODO(), metav1.ListOptions{})
	if err != nil {
		println("unexpected error when watching %q: %v")
	}

	id := "nodejs01"

	for {
		select {
		case e, _ := <-watcher.ResultChan():
			state := watchStates[id]
			println(e.Type)
			if state != nil {
				//fmt.Println(e.Object)
				if e.Type == "DELETED"{

					state.WaiteGroup.Done();
					state.WaitDone = true
				}
				if e.Type == "ADDED"{
					state.WaiteGroup.Done();
					state.WaitDone = true

				}
			}


		}
	}


}
