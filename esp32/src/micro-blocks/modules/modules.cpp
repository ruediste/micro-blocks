#include "modules.h"
#include <vector>
#include "pin.h"
#include <Arduino.h>
#include "logic.h"
#include "math.h"
#include "variables.h"
#include "basic.h"
#include "controls.h"

namespace modules
{
    void setup()
    {
        basicModule::setup();
        pinModule::setup();
        logicModule::setup();
        mathModule::setup();
        variablesModule::setup();
        controlsModule::setup();
    }

    void loop()
    {
        basicModule::loop();
        pinModule::loop();
    }

    void reset()
    {
        basicModule::reset();
        pinModule::reset();
    }
}