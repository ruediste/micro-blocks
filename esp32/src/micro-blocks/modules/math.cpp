#include "logic.h"
#include "../machine.h"
#include <Arduino.h>

namespace mathModule
{

    bool isPrime(long number)
    {
        if (number < 2)
            return false;
        if (number == 2)
            return true;
        if (number % 2 == 0)
            return false;
        for (long i = 3; (i * i) <= number; i += 2)
        {
            if (number % i == 0)
                return false;
        }
        return true;
    }

    void setup()
    {
        // mathBinary
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
                case 5:
                    result = fmod(left, right);
                    break;
                case 6:
                    result = random(left, right);
                    break;

                case 7:
                    result = atan2(left, right);
                    break;

                default:
                    Serial.println("Invalid operation for mathArithmetic");
                }

                // Serial.println(String("mathArithmetic: ") + left + " [" + operation + "] " + right + " = " + result);
                machine::pushFloat(result);
            });

        // mathNumberProperty
        machine::registerFunction(
            15,
            []()
            {
                auto property = machine::popUint8();
                auto number = machine::popFloat();
                bool result;
                switch (property)
                {
                case 0:
                    result = ((int)number % 2) == 0;
                    break;
                case 1:
                    result = ((int)number % 2) == 1;
                    break;
                case 2:
                    result = isPrime((long)number);
                    break;
                case 3:
                    result = ((int)number % 1) == 0;
                    break;
                case 4:
                    result = number > 0;
                    break;
                case 5:
                    result = number < 0;
                    break;
                default:
                    Serial.println("Invalid property for mathNumberProperty");
                }

                Serial.println(String("mathNumberProperty: ") + number + " [" + property + "] = " + result);
                machine::pushUint8(result);
            });

        // unary operations
        machine::registerFunction(
            16,
            []()
            {
                auto operation = machine::popUint8();
                auto number = machine::popFloat();
                float result;
                switch (operation)
                {
                // trig
                case 0:
                    result = sin(number);
                    break;
                case 1:
                    result = cos(number);
                    break;
                case 2:
                    result = tan(number);
                    break;
                case 3:
                    result = asin(number);
                    break;
                case 4:
                    result = acos(number);
                    break;
                case 5:
                    result = atan(number);
                    break;

                // round
                case 6:
                    result = round(number);
                    break;
                case 7:
                    result = ceil(number);
                    break;
                case 8:
                    result = floor(number);
                    break;

                // single
                case 9:
                    result = sqrt(number);
                    break;
                case 10:
                    result = abs(number);
                    break;
                case 11:
                    result = -number;
                    break;
                case 12:
                    result = log(number);
                    break;
                case 13:
                    result = log10(number);
                    break;
                case 14:
                    result = exp(number);
                    break;
                case 15:
                    result = pow(10, number);
                    break;
                default:
                    Serial.println("Invalid operation for mathTrig");
                }

                Serial.println(String("mathTrig: ") + operation + " " + number + " = " + result);
                machine::pushFloat(result);
            });

        // mathRandomFloat
        machine::registerFunction(
            17,
            []()
            {
                machine::pushFloat(rand() / (float)RAND_MAX);
            });

        // mathConstrain
        machine::registerFunction(
            18,
            []()
            {
                auto high = machine::popFloat();
                auto low = machine::popFloat();
                auto number = machine::popFloat();
                if (number < low)
                    number = low;
                if (number > high)
                    number = high;
                machine::pushFloat(number);
            });
    }

}