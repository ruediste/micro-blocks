#include "pin.h"
#include <deque>
#include <vector>
#include <stdint.h>
#include "../machine.h"
#include <Arduino.h>

namespace pinModule
{

    typedef struct
    {
        unsigned long lastChange = 0;
        unsigned long debounce = 0;
        uint16_t threadNr;
        uint8_t pin;
        uint8_t edge;
        bool lastState;
        bool triggered = false;
        bool ready = false;
    } OnPinChangeEntry;

    std::vector<OnPinChangeEntry> onPinChangeEntries;

    void reset()
    {
        onPinChangeEntries.clear();
    }

    void setup()
    {
        // setup on pin change
        machine::registerFunction(
            1,
            []()
            {
                auto debounce = machine::popFloat();
                auto edge = machine::popUint8();
                auto pull = machine::popUint8();
                OnPinChangeEntry entry;
                entry.pin = machine::popUint8();
                entry.edge = edge;
                entry.threadNr = machine::currentThreadNr;
                entry.debounce = debounce;
                switch (pull)
                {
                case 0:
                    pull = 0;
                    break;
                case 1:
                    pull = PULLUP;
                    break;
                case 2:
                    pull = PULLDOWN;
                    break;
                }
                pinMode(entry.pin, INPUT + pull);

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

        analogWriteResolution(10);
        analogWriteFrequency(1000);

        // set pin analog
        machine::registerFunction(
            19,
            []()
            {
                float value = machine::popFloat();
                uint8_t pin = machine::popUint8();
                pinMode(pin, OUTPUT);
                if (value < 0)
                    value = 0;
                if (value > 1)
                    value = 1;
                analogWrite(pin, value * 1023);
            });
    }

    void loop()
    {
        auto now = millis();
        for (auto &entry : onPinChangeEntries)
        {
            // only look at the state if the last state change is at least the debounce time ago
            if (now - entry.lastChange > entry.debounce)
            {
                auto newState = digitalRead(entry.pin);

                switch (entry.edge)
                {
                case 0:
                    entry.triggered = entry.lastState != newState;
                    break;
                case 1:
                    entry.triggered = !entry.lastState && newState;
                    break;
                case 2:
                    entry.triggered = entry.lastState && !newState;
                    break;
                }

                if (entry.lastState != newState)
                {
                    entry.lastState = newState;
                    entry.lastChange = now;
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