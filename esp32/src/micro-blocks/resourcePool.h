#pragma once
#include <stdint.h>
#include <set>
#include <Arduino.h>

namespace resourcePool
{
    class ResourceHandleBase;

    void removeResourceHandle(ResourceHandleBase *handle);
    void addResourceHandle(ResourceHandleBase *handle);
    void clearResources();

    class ResourceHandleBase
    {
    protected:
        uint16_t refCount;

    public:
        virtual ~ResourceHandleBase(){};

        void incRef()
        {
            refCount++;
        }

        void decRef()
        {
            refCount--;
            if (refCount == 0)
            {
                removeResourceHandle(this);
            }
        }
    };

    template <typename T>
    class ResourceHandle : public ResourceHandleBase
    {

    public:
        T *value;

        T &operator*()
        {
            return *value;
        }

        ResourceHandle(T *value)
        {
            this->value = value;
            this->refCount = 1;
        }

        ~ResourceHandle()
        {
            delete value;
        }
    };

    template <typename T>
    ResourceHandle<T> *resourceHandle(T *value)
    {
        auto handle = new ResourceHandle<T>(value);
        addResourceHandle(handle);
        return handle;
    }
}