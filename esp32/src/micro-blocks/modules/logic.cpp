#include "logic.h"
#include "../machine.h"
#include <Arduino.h>

namespace logicModule
{
    void setup()
    {
        // logicCompare
        machine::registerFunction(
            7,
            []()
            {
                auto type = machine::popUint8();
                auto b = machine::popFloat();
                auto a = machine::popFloat();

                switch (type)
                {
                case 0:
                    machine::pushUint8(a == b);
                    break;
                case 1:
                    machine::pushUint8(a != b);
                    break;
                case 2:
                    machine::pushUint8(a < b);
                    break;
                case 3:
                    machine::pushUint8(a <= b);
                    break;
                case 4:
                    machine::pushUint8(a > b);
                    break;
                case 5:
                    machine::pushUint8(a >= b);
                    break;
                default:
                    Serial.println("Invalid type for logicCompare");
                }
            });

        // logicOperation
        machine::registerFunction(
            13,
            []()
            {
                auto type = machine::popUint8();
                auto b = machine::popUint8();
                auto a = machine::popUint8();

                switch (type)
                {
                case 0:
                    machine::pushUint8(a && b);
                    break;
                case 1:
                    machine::pushUint8(a || b);
                    break;
                default:
                    Serial.println("Invalid type for logicOperation");
                }
            });

        // logicNegate
        machine::registerFunction(
            14,
            []()
            {
                auto a = machine::popUint8();
                machine::pushUint8(a == 0);
            });
    }
}