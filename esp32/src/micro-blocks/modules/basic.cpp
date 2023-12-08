#include "basic.h"
#include "../machine.h"
#include <Arduino.h>
#include <deque>
#include <vector>
#include <stdint.h>

namespace basicModule
{
    std::deque<uint16_t> yieldedThreads;

    typedef struct
    {
        unsigned long startTime;
        unsigned long delay;
        uint16_t threadNr;
    } DelayEntry;

    std::vector<DelayEntry> delayEntries;

    void setup()
    {
        // yield function
        machine::registerFunction(
            0,
            []()
            {
                yieldedThreads.push_back(machine::currentThreadNr);
                machine::yieldCurrentThread();
            });

        // end thread
        machine::registerFunction(
            11,
            []()
            {
                machine::yieldCurrentThread();
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

                machine::yieldCurrentThread();
            });

        // pop32
        machine::registerFunction(
            12,
            []()
            {
                machine::popUint32();
            });
    }

    void reset()
    {
        yieldedThreads.clear();
        delayEntries.clear();
    }

    void loop()
    {
        if (!yieldedThreads.empty())
        {
            uint16_t threadNr = yieldedThreads.front();
            yieldedThreads.pop_front();
            machine::runThread(threadNr);
        }

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
    }
}