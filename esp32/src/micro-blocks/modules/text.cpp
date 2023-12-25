#include "text.h"
#include "Arduino.h"
#include <set>
#include "../machine.h"
#include "../resourcePool.h"
#include "../../websocket.h"

using namespace resourcePool;

namespace textModule
{

    const int LOG_LINE_COUNT = 5;
    const int LOG_LINE_LENGTH = 40;
    typedef struct
    {
        uint8_t firstLine = 0;
        uint8_t lineCount = LOG_LINE_COUNT;
        uint8_t lineLength = LOG_LINE_LENGTH;

        char lines[LOG_LINE_COUNT][LOG_LINE_LENGTH];

        void clear()
        {
            firstLine = 0;
            for (int i = 0; i < LOG_LINE_COUNT; i++)
            {
                lines[i][0] = 0;
            }
        }

        void addLine(String &line)
        {
            line.toCharArray(lines[firstLine], LOG_LINE_LENGTH);
            firstLine = (firstLine + 1) % LOG_LINE_COUNT;
        }

    } LogSnapshot;

    websocket::MessageWrapper<LogSnapshot> logSnapshot(websocket::MessageType::LOG_SNAPSHOT);
    bool logChanged;
    time_t lastLogSend;

    void setup()
    {
        logSnapshot.message.clear();
        logChanged = true;
        lastLogSend = millis() - 1000;

        // textLoad
        machine::registerFunction(
            23,
            []()
            {
                auto offset = machine::popUint16();
                auto str = resourceHandle(new String(reinterpret_cast<const char *>(machine::constantPool(offset))));
                machine::pushResourceHandle(str);
            });

        // textNumToString
        machine::registerFunction(
            24,
            []()
            {
                auto value = machine::popFloat();
                auto str = resourceHandle(new String(value));
                machine::pushResourceHandle(str);
            });

        // textPrintString
        machine::registerFunction(
            25,
            []()
            {
                auto str = machine::popResourceHandle<String>();
                // Serial.println(**str);
                logSnapshot.message.addLine(**str);
                logChanged = true;
                str->decRef();
            });

        // textBoolToString
        machine::registerFunction(
            26,
            []()
            {
                auto value = machine::popUint8();
                auto str = resourceHandle(new String(value == 0 ? "false" : "true"));
                machine::pushResourceHandle(str);
            });

        // textJoinString
        machine::registerFunction(
            27,
            []()
            {
                auto str2 = machine::popResourceHandle<String>();
                auto str1 = machine::popResourceHandle<String>();
                auto str = resourceHandle(new String(**str1 + **str2));
                machine::pushResourceHandle(str);
                str1->decRef();
                str2->decRef();
            });
    }

    void loop()
    {
        if (logChanged && millis() - lastLogSend > 300)
        {
            logChanged = false;
            websocket::send(logSnapshot);
            lastLogSend = millis();
        }
    }

    void reset()
    {
        logSnapshot.message.clear();
        logChanged = true;
        lastLogSend = millis() - 1000;
    }
}