#include "tcs34725module.h"
#include "Adafruit_TCS34725.h"
#include "../machine.h"
#include <unordered_map>
#include <stack>

namespace tcs34725module
{
    struct SensorEntry
    {
        Adafruit_TCS34725 *tcs;
        TwoWire *wire;
    };
    std::unordered_map<uint16_t, SensorEntry> sensors;
    std::stack<SensorEntry> pool;

    void setup()
    {
        // tcs34725Setup
        machine::registerFunction(
            41,
            []()
            {
                auto sda = machine::popUint8();
                auto scl = machine::popUint8();
                auto id = machine::popUint16();

                SensorEntry entry;
                if (pool.empty())
                {
                    entry.tcs = new Adafruit_TCS34725(TCS34725_INTEGRATIONTIME_614MS, TCS34725_GAIN_1X);
                    entry.wire = new TwoWire(0);
                }
                else
                {
                    entry = pool.top();
                    pool.pop();
                }

                sensors[id] = entry;
                entry.wire->begin(sda, scl);
                entry.tcs->begin(TCS34725_ADDRESS, entry.wire);
            });

        // tcs34725GetRGB
        machine::registerFunction(
            42,
            []()
            {
                auto id = machine::popUint16();
                auto raw = machine::popUint8();
                auto tcs = sensors[id].tcs;
                uint16_t r, g, b, c;
                tcs->getRawDataOneShot(&r, &g, &b, &c);
                if (raw == 1)
                {
                    machine::pushFloat(r);
                    machine::pushFloat(g);
                    machine::pushFloat(b);
                }
                else if (c == 0)
                {
                    machine::pushFloat(0);
                    machine::pushFloat(0);
                    machine::pushFloat(0);
                }
                else
                {
                    float cf = c;
                    machine::pushFloat(r / cf);
                    machine::pushFloat(g / cf);
                    machine::pushFloat(b / cf);
                }
            });

        // tcs34725GetClear
        machine::registerFunction(
            43,
            []()
            {
                auto id = machine::popUint16();
                auto tcs = sensors[id].tcs;
                uint16_t r, g, b, c;
                tcs->getRawDataOneShot(&r, &g, &b, &c);
                machine::pushFloat(c);
            });

        // tcs34725SetParams
        machine::registerFunction(
            44,
            []()
            {
                auto integrationTime = machine::popUint8();
                auto gain = machine::popUint8();
                auto id = machine::popUint16();
                auto tcs = sensors[id].tcs;
                tcs->setGain((tcs34725Gain_t)gain);
                tcs->setIntegrationTime(integrationTime);
            });
    }

    void reset()
    {
        for (auto tcs : sensors)
        {
            pool.push(tcs.second);
        }
        sensors.clear();
    }
}