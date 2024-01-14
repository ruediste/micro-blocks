#include "rgbLed.h"
#include <NeoPixelBus.h>
#include <NeoPixelAnimator.h>
#include <SPI.h>
#include <SD.h>
#include <unordered_map>
#include "colour.h"
#include "../machine.h"

namespace rgbLedModule
{
    typedef NeoPixelBus<NeoGrbFeature, NeoWs2812xMethod> MyNeoPixelBus;

    // Indices: 0 = g; 1= r; 2 = b
    std::unordered_map<uint16_t, MyNeoPixelBus *> busses;
    void setup()
    {
        //  rgbLedSetup
        machine::registerFunction(
            48,
            []()
            {
                auto pin = machine::popUint8();
                auto count = machine::popUint16();
                auto id = machine::popUint16();

                auto bus = new MyNeoPixelBus(count, pin);
                bus->Begin();
                busses[id] = bus;
            });

        // rgbLedSetColour
        machine::registerFunction(
            49,
            []()
            {
                auto b = machine::popFloat();
                auto g = machine::popFloat();
                auto r = machine::popFloat();
                auto index = machine::popFloat();
                auto id = machine::popUint16();

                auto bus = busses[id];
                bus->SetPixelColor(index, RgbColor(colourModule::deGamma(r) * 255, colourModule::deGamma(g) * 255, colourModule::deGamma(b) * 255));
            });

        // rgbShow
        machine::registerFunction(
            50,
            []()
            {
                auto id = machine::popUint16();
                auto bus = busses[id];
                bus->Show();
            });

        // rgbSetBitmap
        machine::registerFunction(
            51,
            []()
            {
                auto b = machine::popFloat();
                auto g = machine::popFloat();
                auto r = machine::popFloat();
                auto bitmapOffset = machine::popUint16();
                auto id = machine::popUint16();

                auto bus = busses[id];
                auto bitmap = machine::constantPool(bitmapOffset);
                auto count = *(uint16_t *)bitmap;

                auto color = RgbColor(colourModule::deGamma(r) * 255, colourModule::deGamma(g) * 255, colourModule::deGamma(b) * 255);
                for (auto i = 0; i < count; i++)
                {
                    if (bitmap[i + 2] != 0)
                    {
                        bus->SetPixelColor(i, color);
                    }
                }
            });
    }
    void loop() {}

    void reset()
    {
        for (auto &bus : busses)
        {
            delete bus.second;
        }
        busses.clear();
    }
}