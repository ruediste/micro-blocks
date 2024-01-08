#include "./colour.h"
#include "../machine.h"
#include <Wire.h>
#include "Adafruit_TCS34725.h"

namespace colourModule
{

    inline float lerp(float a, float b, float ratio)
    {
        return a + (b - a) * ratio;
    }

    void rgbToHsv(float r, float g, float b, float &h, float &s, float &v)
    {
        float min, max, delta;
        min = r < g ? r : g;
        min = min < b ? min : b;
        max = r > g ? r : g;
        max = max > b ? max : b;
        v = max;
        delta = max - min;
        if (delta < 0.00001)
        {
            s = 0;
            h = 0; // undefined, maybe nan?
            return;
        }
        if (max > 0.0)
        {                      // NOTE: if Max is == 0, this divide would cause a crash
            s = (delta / max); // s
        }
        else
        {
            // if max is 0, then r = g = b = 0
            // s = 0, h is undefined
            s = 0.0;
            h = NAN; // its now undefined
            return;
        }
        if (r >= max)            // > is bogus, just keeps compilor happy
            h = (g - b) / delta; // between yellow & magenta
        else if (g >= max)
            h = 2.0 + (b - r) / delta; // between cyan & yellow
        else
            h = 4.0 + (r - g) / delta; // between magenta & cyan

        h *= 60.0; // degrees

        if (h < 0.0)
            h += 360.0;
    }

    void hsvToRgb(float h, float s, float v, float &r, float &g, float &b)
    {
        double hh, p, q, t, ff;
        int i;
        if (s <= 0.0)
        { // < is bogus, just shuts up warnings
            r = v;
            g = v;
            b = v;
            return;
        }
        hh = h;
        if (hh >= 360.0)
            hh = 0.0;
        hh /= 60.0;
        i = hh;
        ff = hh - i;
        p = v * (1.0 - s);
        q = v * (1.0 - (s * ff));
        t = v * (1.0 - (s * (1.0 - ff)));

        switch (i)
        {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;

        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
        default:
            r = v;
            g = p;
            b = q;
            break;
        }
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
                case 3:
                {
                    float h, s, v;
                    rgbToHsv(r, g, b, h, s, v);
                    machine::pushFloat(h);
                    break;
                }
                case 4:
                {
                    float h, s, v;
                    rgbToHsv(r, g, b, h, s, v);
                    machine::pushFloat(s);
                    break;
                }
                case 5:
                {
                    float h, s, v;
                    rgbToHsv(r, g, b, h, s, v);
                    machine::pushFloat(v);
                    break;
                }
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

        // colourFromHSV: 47,
        machine::registerFunction(
            47,
            []()
            {
                auto v = machine::popFloat();
                auto s = machine::popFloat();
                auto h = machine::popFloat();
                float r, g, b;
                hsvToRgb(h, s, v, r, g, b);
                machine::pushFloat(r);
                machine::pushFloat(g);
                machine::pushFloat(b);
            });
    }
}