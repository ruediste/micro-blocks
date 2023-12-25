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
#include "tft.h"
#include "text.h"
#include "gui.h"
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
        tftModule::setup();
        textModule::setup();
        guiModule::setup();
    }

    void loop()
    {
        pinModule::loop();
        sensorModule::loop();
        tftModule::loop();
        textModule::loop();
        guiModule::loop();

        // the basic module should come last, to run yielded thread with lowest priority
        basicModule::loop();
    }

    void reset()
    {
        basicModule::reset();
        pinModule::reset();
        textModule::reset();
        guiModule::reset();
    }
}