#include "modules.h"
#include <vector>
#include "pin.h"
#include <Arduino.h>
#include "logic.h"
#include "math.h"
#include "variables.h"
#include "basic.h"
#include "controls.h"
#include "sensor.h"

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
        sensorModule::setup();
    }

    void loop()
    {
        basicModule::loop();
        pinModule::loop();
        sensorModule::loop();
    }

    void reset()
    {
        basicModule::reset();
        pinModule::reset();
    }
}