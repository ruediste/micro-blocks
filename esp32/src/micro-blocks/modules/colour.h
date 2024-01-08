#pragma once
#include <cmath>

namespace colourModule
{
    void setup();

    inline float gamma(float input)
    {
        return pow(input, 1 / 2.2);
    }

    inline float deGamma(float input)
    {
        return pow(input, 2.2);
    }
}