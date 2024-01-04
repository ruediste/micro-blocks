#include "./colour.h"
#include "../machine.h"
#include <cmath>
#include <Wire.h>
#include "Adafruit_TCS34725.h"

namespace colourModule
{
    inline float gamma(float input)
    {
        return pow(input, 1 / 2.2);
    }

    inline float deGamma(float input)
    {
        return pow(input, 2.2);
    }

    inline float lerp(float a, float b, float ratio)
    {
        return a + (b - a) * ratio;
    }

    void setup()
    {
        // colourGetChannel: 38,
        machine::registerFunction(
            38,
            []()
            {
                auto channel = machine::popUint8();
                auto b = machine::popFloat();
                auto g = machine::popFloat();
                auto r = machine::popFloat();
                switch (channel)
                {
                case 0:
                    machine::pushFloat(r);
                    break;
                case 1:
                    machine::pushFloat(g);
                    break;
                case 2:
                    machine::pushFloat(b);
                    break;
                }
            });

        // colourSetVar
        machine::registerFunction(
            39,
            []()
            {
                auto b = machine::popFloat();
                auto g = machine::popFloat();
                auto r = machine::popFloat();
                auto offset = machine::popUint16();
                *((float *)machine::variable(offset)) = r;
                *((float *)machine::variable(offset + 4)) = g;
                *((float *)machine::variable(offset + 8)) = b;
            });

        // colourBlend
        machine::registerFunction(
            40,
            []()
            {
                auto ratio = machine::popFloat();
                auto b2 = machine::popFloat();
                auto g2 = machine::popFloat();
                auto r2 = machine::popFloat();
                auto b = machine::popFloat();
                auto g = machine::popFloat();
                auto r = machine::popFloat();
                machine::pushFloat(gamma(lerp(deGamma(r), deGamma(r2), ratio)));
                machine::pushFloat(gamma(lerp(deGamma(g), deGamma(g2), ratio)));
                machine::pushFloat(gamma(lerp(deGamma(b), deGamma(b2), ratio)));
            });
    }
}