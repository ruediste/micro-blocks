#pragma once
#include <stddef.h>
#include <stdint.h>
#include <functional>

namespace machine
{
    typedef std::function<void()> MachineFunction;

    void setup();
    void loop();

    void applyCode(uint8_t *buf, size_t size);

    extern uint16_t currentThreadNr;
    void yieldCurrentThread();
    void runThread(uint16_t threadNr);

    uint8_t popUint8();
    uint16_t popUint16();
    void pushUint8(uint8_t value);
    void pushUint16(uint16_t value);

    void registerFunction(uint16_t functionNr, MachineFunction function);

}