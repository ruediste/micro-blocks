#pragma once
#include <stdint.h>

namespace basicModule
{
    void setup();
    void loop();
    void reset();
    void yieldCurrentThread();

    void triggerCallback(uint16_t threadNr);
}