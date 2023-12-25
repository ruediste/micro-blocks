#include "text.h"
#include "Arduino.h"
#include <set>
#include "../machine.h"
#include "../resourcePool.h"

using namespace resourcePool;

namespace textModule
{

    void setup()
    {
        // textLoad
        machine::registerFunction(
            23,
            []()
            {
                auto offset = machine::popUint16();
                auto str = resourceHandle(new String(reinterpret_cast<const char *>(machine::constantPool(offset))));
                machine::pushUint32(reinterpret_cast<uint32_t>(str));
            });

        // textNumToString
        machine::registerFunction(
            24,
            []()
            {
                auto value = machine::popFloat();
                auto str = resourceHandle(new String(value));
                machine::pushUint32(reinterpret_cast<uint32_t>(str));
            });

        // textPrintString
        machine::registerFunction(
            25,
            []()
            {
                auto str = reinterpret_cast<ResourceHandle<String> *>(machine::popUint32());
                Serial.println(*(str->value));
                str->decRef();
            });

        // textBoolToString
        machine::registerFunction(
            26,
            []()
            {
                auto value = machine::popUint8();
                auto str = resourceHandle(new String(value == 0 ? "false" : "true"));
                machine::pushUint32(reinterpret_cast<uint32_t>(str));
            });

        // textJoinString
        machine::registerFunction(
            27,
            []()
            {
                auto str2 = reinterpret_cast<ResourceHandle<String> *>(machine::popUint32());
                auto str1 = reinterpret_cast<ResourceHandle<String> *>(machine::popUint32());
                auto str = resourceHandle(new String(**str1 + **str2));
                machine::pushUint32(reinterpret_cast<uint32_t>(str));
                str1->decRef();
                str2->decRef();
            });
    }

    void loop()
    {
    }

    void reset()
    {
    }
}