#include "logic.h"
#include "../machine.h"
#include <Arduino.h>

namespace mathModule
{
    void setup()
    {
        // mathArithmetic
        machine::registerFunction(
            6,
            []()
            {
                auto operation = machine::popUint8();
                auto right = machine::popFloat();
                auto left = machine::popFloat();

                float result;
                switch (operation)
                {
                case 0:
                    result = left + right;
                    break;
                case 1:
                    result = left - right;
                    break;
                case 2:
                    result = left * right;
                    break;
                case 3:
                    result = left / right;
                    break;
                case 4:
                    result = pow(left, right);
                    break;
                default:
                    Serial.println("Invalid operation for mathArithmetic");
                }

                Serial.println(String("mathArithmetic: ") + left + " [" + operation + "] " + right + " = " + result);
                machine::pushFloat(result);
            });

        // mathModulo
        machine::registerFunction(
            8,
            []()
            {
                auto divisor = machine::popFloat();
                auto dividend = machine::popFloat();
                auto result = fmod(dividend, divisor);
                Serial.println(String("mathModulo: ") + dividend + " % " + divisor + " = " + result);
                machine::pushFloat(result);
            });
    }
}