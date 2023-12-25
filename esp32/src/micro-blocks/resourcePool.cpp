#include "resourcePool.h"

namespace resourcePool
{
    std::set<ResourceHandleBase *> resources;

    void removeResourceHandle(ResourceHandleBase *handle)
    {
        resources.erase(handle);
        delete handle;
    }
    void addResourceHandle(ResourceHandleBase *handle)
    {
        resources.insert(handle);
    }

    void clearResources()
    {
        for (auto resource : resources)
        {
            delete resource;
        }
        resources.clear();
    }
}