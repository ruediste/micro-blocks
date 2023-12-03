#include "modules.h"
#include <vector>
#include "pinReadWrite.h"
#include <Arduino.h>

namespace modules
{
    void setup()
    {
        pinReadWriteModule::setup();
    }

    void loop()
    {
        pinReadWriteModule::loop();
    }

    void reset()
    {
        pinReadWriteModule::reset();
    }
}