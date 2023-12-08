#include "variables.h"
#include "../machine.h"
#include <Arduino.h>

namespace variablesModule
{
    void setup()
    {
        // setVar32
        machine::registerFunction(
            4,
            []()
            {
                auto value = machine::popUint32();
                auto offset = machine::popUint16();
                *((uint32_t *)machine::variable(offset)) = value;
            });

        // getVar32
        machine::registerFunction(
            5,
            []()
            {
                auto offset = machine::popUint16();
                machine::pushUint32(*((uint32_t *)machine::variable(offset)));
            });
    }
}