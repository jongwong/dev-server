package kubestore

import (
	"dev-controller/kubeutil"
)

type StoreManager struct {
	store map[string]*kubeutil.KubeInstance
}

func (storeManager *StoreManager) Add(id string, kubeInstance *kubeutil.KubeInstance) {
	storeManager.store[id] = kubeInstance

}
func (storeManager *StoreManager) Delete(id string) {
	if storeManager.store[id] != nil {
		delete(storeManager.store, id)
	}

}
