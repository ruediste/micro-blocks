#include "basic.h"
#include "../machine.h"
#include <Arduino.h>
#include <deque>
#include <vector>
#include <set>
#include <stdint.h>
#include "../../websocket.h"

namespace basicModule
{
    std::deque<uint16_t> yieldedThreads;

    std::set<uint16_t> readyCallbacks;
    std::set<uint16_t> triggeredCallbacks;

    void triggerCallback(uint16_t threadNr)
    {
        triggeredCallbacks.insert(threadNr);
    }

    typedef struct
    {
        unsigned long startTime;
        unsigned long delay;
        uint16_t threadNr;
    } DelayEntry;

    std::vector<DelayEntry> delayEntries;

    void yieldCurrentThread()
    {
        yieldedThreads.push_back(machine::currentThreadNr);
        machine::suspendCurrentThread();
    }

    void setup()
    {
        // yield function
        machine::registerFunction(0, yieldCurrentThread);

        // end thread
        machine::registerFunction(
            11,
            []()
            {
                machine::suspendCurrentThread();
            });

        // basicCallbackReady
        machine::registerFunction(
            31,
            []()
            {
                readyCallbacks.insert(machine::currentThreadNr);
                machine::suspendCurrentThread();
            });

        // basicDelay
        machine::registerFunction(
            9,
            []()
            {
                DelayEntry entry;
                entry.threadNr = machine::currentThreadNr;
                entry.delay = machine::popFloat();
                entry.startTime = millis();

                delayEntries.push_back(entry);

                machine::suspendCurrentThread();
            });

        // pop32
        machine::registerFunction(
            12,
            []()
            {
                machine::popUint32();
            });

        websocket::handle<uint16_t>(
            websocket::MessageType::BASIC_TRIGGER_CALLBACK,
            [](uint16_t &message)
            {
                triggeredCallbacks.insert(message);
            });
    }

    void reset()
    {
        yieldedThreads.clear();
        delayEntries.clear();
    }

    void loop()
    {
        for (auto entry = delayEntries.begin(); entry != delayEntries.end();)
        {
            if (millis() - entry->startTime >= entry->delay)
            {
                delayEntries.erase(entry);
                machine::runThread(entry->threadNr);
                break; // break here, as running the thread might modify the delayEntries vector
            }
            else
            {
                entry++;
            }
        }

        for (auto cb : triggeredCallbacks)
        {
            if (readyCallbacks.find(cb) != readyCallbacks.end())
            {
                triggeredCallbacks.erase(cb);
                readyCallbacks.erase(cb);
                machine::runThread(cb);
                break;
            }
        }

        if (!yieldedThreads.empty())
        {
            uint16_t threadNr = yieldedThreads.front();
            yieldedThreads.pop_front();
            machine::runThread(threadNr);
        }
    }
}