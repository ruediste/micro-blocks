#include "sensor.h"
#include "websocket.h"
#include "../machine.h"
#include <Arduino.h>

namespace sensorModule
{
    typedef struct __packed__
    {
        float x;
        float y;
        float z;
    } GravitySensorValue;

    GravitySensorValue lastGravitySensorValue{.x = 0, .y = 0, .z = 0};

    void setup()
    {
        websocket::handle<GravitySensorValue>(websocket::MessageType::GRAVITY_SENSOR_VALUE, [](GravitySensorValue &message)
                                              { 
                                                //  Serial.println(String("receive value ")+message.x+" "+message.y+" "+message.z);
                                                lastGravitySensorValue = message; });

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
    }

    void loop()
    {
    }
}