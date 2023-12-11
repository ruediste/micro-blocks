#include "sensor.h"
#include "websocket.h"
#include "../machine.h"
#include <Arduino.h>
#include <deque>
#include <unordered_map>

namespace sensorModule
{
    typedef struct __packed__
    {
        float x;
        float y;
        float z;
    } GravitySensorValue;

    GravitySensorValue lastGravitySensorValue{.x = 0, .y = 0, .z = 0};

    typedef struct
    {
        bool triggered = false;
        bool waiting = false;
    } OnGravitySensorChangeEntry;

    std::unordered_map<uint16_t, OnGravitySensorChangeEntry> onGravitySensorChangeEntries;

    void setup()
    {
        websocket::handle<GravitySensorValue>(
            websocket::MessageType::GRAVITY_SENSOR_VALUE,
            [](GravitySensorValue &message)
            {
                lastGravitySensorValue = message;

                for (auto &entry : onGravitySensorChangeEntries)
                {
                    entry.second.triggered = true;
                }
            });

        // sensorGetGravityValue
        machine::registerFunction(
            20,
            []()
            {
                auto axis = machine::popUint8();
                float result;
                switch (axis)
                {
                case 0:
                    result = lastGravitySensorValue.x;
                    break;
                case 1:
                    result = lastGravitySensorValue.y;
                    break;
                case 2:
                    result = lastGravitySensorValue.z;
                    break;
                default:
                    Serial.println("Invalid axis for getGravitySensorValue");
                }
                // Serial.println(String("get gravity axis ") + axis + " is " + result);
                machine::pushFloat(result);
            });

        // setup on gravity sensor change
        machine::registerFunction(
            21,
            []()
            {
                OnGravitySensorChangeEntry entry;
                onGravitySensorChangeEntries[machine::currentThreadNr] = entry;
            });

        // wait for gravity sensor change
        machine::registerFunction(
            21,
            []()
            {
                onGravitySensorChangeEntries[machine::currentThreadNr].waiting = true;
                machine::suspendCurrentThread();
            });
    }

    void loop()
    {
        for (auto &entry : onGravitySensorChangeEntries)
        {
            if (entry.second.triggered && entry.second.waiting)
            {
                entry.second.triggered = false;
                entry.second.waiting = false;
                machine::runThread(entry.first);
                break;
            }
        }
    }
}