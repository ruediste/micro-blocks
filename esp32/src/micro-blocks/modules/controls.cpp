#include "controls.h"
#include "../machine.h"

namespace controlsModule
{
    void setup()
    {
        machine::registerFunction(
            10,
            []()
            {
                float times = machine::popFloat();
                times -= 1;
                machine::pushFloat(times);
                machine::pushUint8(times <= 0 ? 1 : 0);
            });
    }
}