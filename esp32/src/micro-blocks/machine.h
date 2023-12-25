#pragma once
#include <stddef.h>
#include <stdint.h>
#include <functional>
#include "resourcePool.h"

namespace machine
{
    typedef std::function<void()> MachineFunction;

    void setup();
    void loop();

    void applyCode(uint8_t *buf, size_t size);

    extern uint16_t currentThreadNr;
    void suspendCurrentThread();
    void runThread(uint16_t threadNr);

    uint8_t popUint8();
    uint16_t popUint16();
    uint32_t popUint32();

    template <typename T>
    resourcePool::ResourceHandle<T> *popResourceHandle()
    {
        return reinterpret_cast<resourcePool::ResourceHandle<T> *>(machine::popUint32());
    }

    float popFloat();
    void pushUint8(uint8_t value);
    void pushUint16(uint16_t value);
    void pushUint32(uint32_t value);

    template <typename T>
    void pushResourceHandle(resourcePool::ResourceHandle<T> *handle)
    {
        pushUint32(reinterpret_cast<uint32_t>(handle));
    }

    void pushFloat(float value);
    uint8_t *variable(uint16_t offset);
    uint8_t *constantPool(uint16_t offset);

    void registerFunction(uint16_t functionNr, MachineFunction function);

}