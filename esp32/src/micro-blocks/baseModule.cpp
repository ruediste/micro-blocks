#include "baseModule.h"
#include <deque>
#include <vector>
#include <stdint.h>
#include "machine.h"
#include <Arduino.h>

namespace baseModule
{
    std::deque<uint16_t> yieldedThreads;

    typedef struct
    {
        unsigned long debounceEndTime = 0;
        uint16_t threadNr;
        uint8_t pin;
        bool lastState;
        bool triggered = false;
        bool ready = false;
    } OnPinChangeEntry;

    std::vector<OnPinChangeEntry> onPinChangeEntries;

    void reset()
    {
        yieldedThreads.clear();
        onPinChangeEntries.clear();
    }

    void setup()
    {
        // yield function
        machine::registerFunction(
            0,
            []()
            {
                Serial.println(String("Thread yielding ") + machine::currentThreadNr);
                yieldedThreads.push_back(machine::currentThreadNr);
                machine::yieldCurrentThread();
            });

        // setup on pin change
        machine::registerFunction(
            1,
            []()
            {
                OnPinChangeEntry entry;
                entry.pin = machine::popUint8();
                entry.threadNr = machine::currentThreadNr;
                pinMode(entry.pin, INPUT + PULLUP);

                entry.lastState = digitalRead(entry.pin);
                onPinChangeEntries.push_back(entry);
                Serial.println(String("Thread ") + machine::currentThreadNr + ": setup on pin " + entry.pin + " change");
            });

        // wait for pin change
        machine::registerFunction(
            2,
            []()
            {
                for (auto &entry : onPinChangeEntries)
                {
                    if (entry.threadNr == machine::currentThreadNr)
                    {
                        entry.ready = true;
                        Serial.println(String("Thread ") + machine::currentThreadNr + " waiting on pin " + entry.pin);
                        break;
                    }
                }
                machine::yieldCurrentThread();
            });

        // set pin
        machine::registerFunction(
            3,
            []()
            {
                uint8_t value = machine::popUint8();
                uint8_t pin = machine::popUint8();

                Serial.println(String("Thread ") + machine::currentThreadNr + " set pin " + pin + " to value " + value);
                pinMode(pin, OUTPUT);
                digitalWrite(pin, value);
            });
    }

    void loop()
    {
        if (!yieldedThreads.empty())
        {
            uint16_t threadNr = yieldedThreads.front();
            yieldedThreads.pop_front();
            Serial.println(String("Running yielded thread ") + threadNr);
            machine::runThread(threadNr);
        }

        auto now = millis();
        for (auto &entry : onPinChangeEntries)
        {
            // only look at the state if the last state change is at least the debounce time ago
            if (entry.debounceEndTime < now)
            {
                auto newState = digitalRead(entry.pin);
                // Serial.println(String("Pin ") + entry.pin + " state " + newState);
                if (entry.lastState && !newState)
                {
                    entry.triggered = true;
                }

                if (entry.lastState != newState)
                {
                    entry.lastState = newState;
                    entry.debounceEndTime = now + 200;
                }
            }

            // if the entry is ready (by calling wait for pin change) and the pin has changed, run the thread
            if (entry.ready && entry.triggered)
            {
                entry.triggered = false;
                entry.ready = false;
                Serial.println("Pin change");
                machine::runThread(entry.threadNr);
            }
        }
    }
}